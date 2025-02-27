require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Required for role assignment
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const allowedRoleName = "Spelledare"; // Change this to the required role name
const commandPrefix = "!Unicorn "; // Set the command prefix

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(commandPrefix)) return; // Ignore bot messages and those without prefix

    // Restrict command usage to users with the allowed role
    const member = message.guild.members.cache.get(message.author.id);
    if (!member.roles.cache.some(role => role.name === allowedRoleName)) {
        return message.reply("❌ You don’t have permission to use this command!");
    }

     if (message.content.startsWith(`${commandPrefix}poll`)) {
        const args = message.content.split(' ').slice(1);
        if (args.length < 3) {
            return message.channel.send('Usage: `poll <role_name> <duration_in_seconds> <channel_id>`');
        }

        const roleName = args.slice(0, -2).join(' ');
        const duration = parseInt(args[args.length - 2]);
        const channelId = args[args.length - 1];

        if (isNaN(duration) || duration <= 0) {
            return message.channel.send('⏳ Please provide a valid poll duration in seconds.');
        }

        const textChannel = message.guild.channels.cache.get(channelId);
        if (!textChannel) {
            return message.channel.send('❌ Invalid channel ID. Make sure the bot has access.');
        }

        // Check if the role already exists
        let role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            try {
                role = await message.guild.roles.create({
                    name: roleName,
                    color: 'FF9FF9',
                    permissions: [],
                });
                message.channel.send(`✅ Created role: **${roleName}**`);
            } catch (error) {
                console.error(error);
                return message.channel.send('❌ Failed to create role.');
            }
        } else {
            message.channel.send(`⚠ Role **${roleName}** already exists.`);
        }

        // Set full channel permissions for the new role
        try {
            await textChannel.permissionOverwrites.create(role, {
                ViewChannel: true,
                SendMessages: true,
                ManageMessages: true,
                ManageChannels: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true,
                UseApplicationCommands: true
            });
            message.channel.send(`🔧 Updated permissions for <#${channelId}> so **${roleName}** can access it.`);
        } catch (error) {
            console.error(error);
            return message.channel.send('❌ Failed to update channel permissions.');
        }

        // Create the poll message
        const pollMessage = await message.channel.send(
            `📢 **Poll Started!** React ✅ to get the **${roleName}** role.
⏳ Poll ends in **${duration} seconds**.
🔒 Special access to <#${channelId}> will be granted!`
        );
        await pollMessage.react('✅');

        // Reaction collector for assigning the role
        const filter = (reaction, user) => reaction.emoji.name === '✅' && !user.bot;
        const collector = pollMessage.createReactionCollector({ filter, dispose: true, time: duration * 1000 });

        collector.on('collect', async (reaction, user) => {
            const member = await message.guild.members.fetch(user.id);
            await member.roles.add(role);
            user.send(`✅ You have been given the **${roleName}** role. You can now access <#${channelId}>.`);
        });

        collector.on('remove', async (reaction, user) => {
            const member = await message.guild.members.fetch(user.id);
            await member.roles.remove(role);
            user.send(`❌ The **${roleName}** role has been removed. You can no longer access <#${channelId}>.`);
        });

        // When time is up, stop the collector
        collector.on('end', () => {
            pollMessage.edit(`📢 **Poll Closed!** No more reactions will be counted.`);
            pollMessage.reactions.removeAll().catch(console.error);
        });
    }
});

client.login(process.env.TOKEN);
