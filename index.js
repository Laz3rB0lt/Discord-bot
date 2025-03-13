require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChannelType, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const DEFAULT_CATEGORY_ID = '1341408945046294539'; // Your default category ID

// Slash command registration
const commands = [
    new SlashCommandBuilder()
        .setName('game')
        .setDescription('Manage game channels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new game channel')
                .addStringOption(option =>
                    option.setName('channel_name')
                        .setDescription('Name of the new channel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Move your game channel to another category')
                .addStringOption(option =>
                    option.setName('category_id')
                        .setDescription('ID of the new category')
                        .setRequired(true)))
].map(command => command.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
})();

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

                await interaction.reply(`✅ Created channel: <#${newChannel.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to create the channel.', ephemeral: true });
            }
        }

        if (interaction.options.getSubcommand() === 'start') {
            const newCategoryId = options.getString('category_id');
            const member = interaction.member;

            try {
                // Find the first text channel the user owns
                const userChannels = interaction.guild.channels.cache.filter(channel =>
                    channel.type === ChannelType.GuildText && channel.permissionOverwrites.cache.has(member.id)
                );

                if (userChannels.size === 0) {
                    return interaction.reply({ content: '❌ You do not own any game channels.', ephemeral: true });
                }

                const gameChannel = userChannels.first();

                // Move the channel to the new category
                await gameChannel.setParent(newCategoryId);

                await interaction.reply(`✅ Moved <#${gameChannel.id}> to <#${newCategoryId}>`);
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
