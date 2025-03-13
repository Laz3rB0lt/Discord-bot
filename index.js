require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'poll') {
        const roleName = interaction.options.getString('role');
        const duration = interaction.options.getInteger('duration');
        const textChannel = interaction.options.getChannel('channel');

        if (!textChannel || !textChannel.isTextBased()) {
            return interaction.reply('❌ Please select a valid text channel.');
        }

        let role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            try {
                role = await interaction.guild.roles.create({
                    name: roleName,
                    color: 'FF9FF9',
                    permissions: []
                });
                await interaction.reply(`✅ Created role: **${roleName}**`);
            } catch (error) {
                console.error(error);
                return interaction.reply('❌ Failed to create role.');
            }
        } else {
            await interaction.reply(`⚠ Role **${roleName}** already exists.`);
        }

        try {
            await textChannel.permissionOverwrites.create(role, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.followUp(`🔧 Updated permissions for <#${textChannel.id}> so **${roleName}** can access it.`);
        } catch (error) {
            console.error(error);
            return interaction.followUp('❌ Failed to update channel permissions.');
        }

        const pollMessage = await interaction.followUp(
            `📢 **Poll Started!** React ✅ to get the **${roleName}** role.\n⏳ Poll ends in **${duration} seconds**.\n🔒 Special access to <#${textChannel.id}> will be granted!`
        );
        await pollMessage.react('✅');

        const filter = (reaction, user) => reaction.emoji.name === '✅' && !user.bot;
        const collector = pollMessage.createReactionCollector({ filter, dispose: true, time: duration * 1000 });

        collector.on('collect', async (reaction, user) => {
            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.add(role);
            user.send(`✅ You have been given the **${roleName}** role. You can now access <#${textChannel.id}>.`);
        });

        collector.on('remove', async (reaction, user) => {
            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.remove(role);
            user.send(`❌ The **${roleName}** role has been removed. You can no longer access <#${textChannel.id}>.`);
        });

        collector.on('end', () => {
            pollMessage.edit(`📢 **Poll Closed!** No more reactions will be counted.`);
            pollMessage.reactions.removeAll().catch(console.error);
        });
    }
});

client.login(process.env.TOKEN);
