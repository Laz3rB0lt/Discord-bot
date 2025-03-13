require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll to assign roles')
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Name of the role to assign')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration of the poll in seconds')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel where the role will be used')
                .setRequired(true)),
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

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();