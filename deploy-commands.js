require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('game')
        .setDescription('Manage game channels')
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('Create a new game channel')
                .addStringOption(option =>
                    option.setName('channel_name')
                        .setDescription('Name of the new channel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Move your game channel to the started games category'))
        .addSubcommand(subcommand =>
            subcommand.setName('end')
                .setDescription('Delete the game channel')),
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a role-based poll')
        .addStringOption(option =>
            option.setName('role')
                .setDescription('The role name for the poll')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Poll duration in seconds')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The text channel for the poll')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Set the required role to use bot commands')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role that can use bot commands')
                .setRequired(true))
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