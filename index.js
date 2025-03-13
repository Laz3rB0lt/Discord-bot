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


// Command handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'game') {
        if (interaction.options.getSubcommand() === 'create') {
            const channelName = options.getString('channel_name');

            try {
                // Create a new text channel under the default category
                const newChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: DEFAULT_CATEGORY_ID,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id, // @everyone
                            deny: [PermissionsBitField.Flags.ViewChannel], // Hide channel
                        },
                        {
                            id: interaction.user.id, // Creator
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels], // Allow access
                        }
                    ]
                });

                // Store channel creator in permissions
                await newChannel.permissionOverwrites.create(interaction.user, {
                    ViewChannel: true,
                    ManageChannels: true
                });

                await interaction.reply(`✅ Created channel: <#${newChannel.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to create the channel.', ephemeral: true });
            }
        }

        if (interaction.options.getSubcommand() === 'start') {
            const channel = interaction.channel;

            // Check if the channel is in the correct category
            if (channel.parentId !== DEFAULT_CATEGORY_ID) {
                return interaction.reply({ content: '❌ You can only start a game in a channel created with `/game create`.', ephemeral: true });
            }

            // Check if the user is the creator (has special perms)
            const permissions = channel.permissionOverwrites.cache.get(interaction.user.id);
            if (!permissions || !permissions.allow.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ You are not the creator of this channel.', ephemeral: true });
            }

            try {
                // Move the channel to the started games category
                await channel.setParent(STARTED_GAMES_CATEGORY_ID);
                await interaction.reply(`✅ **Game started!** <#${channel.id}> has been moved to the started games category.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to move the channel.', ephemeral: true });
            }
        }
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
