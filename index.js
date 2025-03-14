require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChannelType, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const DEFAULT_CATEGORY_ID = '1341408945046294539'; // Where game channels are first created
const STARTED_GAMES_CATEGORY_ID = '1342791810849833063'; // Where started games are moved
const ENDED_GAMES_CATEGORY_ID = '1342791884585701469'; // Where ended games are moved

// Dynamic role requirement for commands
let requiredRoleId = null;

// Command handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;

    // Role requirement check
    if (requiredRoleId && !member.roles.cache.has(requiredRoleId)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    if (commandName === 'game') {
        if (options.getSubcommand() === 'create') {
            const channelName = options.getString('channel_name');

            try {
                const newChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: DEFAULT_CATEGORY_ID
                });

                await newChannel.permissionOverwrites.create(member.id, {
                    ViewChannel: true,
                    ManageChannels: true
                });

                await interaction.reply(`✅ Created channel: <#${newChannel.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to create the channel.', ephemeral: true });
            }
        }

        if (options.getSubcommand() === 'start') {
            if (channel.parentId !== DEFAULT_CATEGORY_ID) {
                return interaction.reply({ content: '❌ You can only start a game in a channel created with `/game create`.', ephemeral: true });
            }

            const permissions = channel.permissionOverwrites.cache.get(member.id);
            if (!permissions || !permissions.allow.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ You are not the creator of this channel.', ephemeral: true });
            }

            try {
                await channel.setParent(STARTED_GAMES_CATEGORY_ID);
                await interaction.reply(`✅ **Game started!** <#${channel.id}> has been moved.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to move the channel.', ephemeral: true });
            }
        }

        if (options.getSubcommand() === 'end') {
            if (channel.parentId !== STARTED_GAMES_CATEGORY_ID) {
                return interaction.reply({ content: '❌ This command can only be used in a started game channel.', ephemeral: true });
            }

            const permissions = channel.permissionOverwrites.cache.get(member.id);
            if (!permissions || !permissions.allow.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ You are not the creator of this channel.', ephemeral: true });
            }

            try {
                await channel.setParent(ENDED_GAMES_CATEGORY_ID);
                await interaction.reply(`✅ **Game ended!** The channel has been deleted.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to delete the channel.', ephemeral: true });
            }
        }
    }

    if (commandName === 'setrole') {
        const role = options.getRole('role');
        requiredRoleId = role.id;
        await interaction.reply(`✅ The required role to use bot commands is now **${role.name}**.`);
    }

    if (commandName === 'poll') {
        const roleName = options.getString('role');
        const duration = options.getInteger('duration');
        const textChannel = options.getChannel('channel');

        if (!textChannel || !textChannel.isTextBased()) {
            return interaction.reply('❌ Please select a valid text channel.');
        }

        let role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            try {
                role = await guild.roles.create({
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
            const member = await guild.members.fetch(user.id);
            await member.roles.add(role);
            user.send(`✅ You have been given the **${roleName}** role. You can now access <#${textChannel.id}>.`);
        });

        collector.on('remove', async (reaction, user) => {
            const member = await guild.members.fetch(user.id);
            await member.roles.remove(role);
            user.send(`❌ The **${roleName}** role has been removed. You can no longer access <#${textChannel.id}>.`);
        });

        collector.on('end', () => {
            pollMessage.edit(`📢 **Poll Closed!** No more reactions will be counted.`);
            pollMessage.reactions.removeAll().catch(console.error);
        });
    }
});

// Bot Ready
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Login Bot
client.login(process.env.TOKEN);