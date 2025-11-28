require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

    // ------------------------
    // /game
    // ------------------------
    new SlashCommandBuilder()
        .setName('game')
        .setDescription('Game channel management')
        .addSubcommand(sub =>
            sub.setName('create')
               .setDescription('Create a game channel')
               .addStringOption(opt =>
                    opt.setName('channel_name')
                       .setDescription('Name of the new channel')
                       .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('start')
               .setDescription('Start a game in this channel')
        )
        .addSubcommand(sub =>
            sub.setName('end')
               .setDescription('End the current game')
        ),

    // ------------------------
    // /setrole
    // ------------------------
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Set required role for bot commands')
        .addRoleOption(opt =>
            opt.setName('role')
               .setDescription('Role that can use bot commands')
               .setRequired(true)
        ),

    // ------------------------
    // /poll
    // ------------------------
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Start a joinable poll')
        .addStringOption(opt =>
            opt.setName('role')
               .setDescription('Role to assign to joiners')
               .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('duration')
               .setDescription('Poll duration in seconds')
               .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('channel')
               .setDescription('Channel where the poll is posted')
               .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('max_responses')
               .setDescription('Maximum number of participants')
               .setRequired(false)
        )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Slash commands registered!');
    } catch (err) {
        console.error(err);
    }
})();
