require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    ChannelType,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
    ]
});

// Category IDs
const DEFAULT_CATEGORY_ID = '1341408945046294539';
const STARTED_GAMES_CATEGORY_ID = '1342791810849833063';
const ENDED_GAMES_CATEGORY_ID = '1342791884585701469';

// Role requirement
let requiredRoleId = null;

// Command handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;

    // Role requirement check
    if (requiredRoleId && !member.roles.cache.has(requiredRoleId)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    // -------------------------------
    // /game create, start, end
    // -------------------------------
    if (commandName === 'game') {
        if (options.getSubcommand() === 'create') {
            const channelName = options.getString('channel_name');

            try {
                const newChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: DEFAULT_CATEGORY_ID
                });

                const botsRole = guild.roles.cache.find(role => role.name === "Bots");

                await newChannel.permissionOverwrites.create(member.id, {
                    ViewChannel: true,
                    ManageChannels: true
                });

                if (botsRole) {
                    await newChannel.permissionOverwrites.create(botsRole, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        ManageMessages: true,
                        ManageChannels: true,
                    });
                }

                await interaction.reply(`✅ Created channel: <#${newChannel.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to create channel.', ephemeral: true });
            }
        }

        if (options.getSubcommand() === 'start') {
            if (channel.parentId !== DEFAULT_CATEGORY_ID) {
                return interaction.reply({ content: '❌ You can only start a game in a newly created channel.', ephemeral: true });
            }

            try {
                await channel.setParent(STARTED_GAMES_CATEGORY_ID, { lockPermissions: false });
                await channel.permissionOverwrites.create(member.id, {
                    ViewChannel: true,
                    ManageChannels: true,
                    ManageMessages: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                await interaction.reply(`✅ **Game started!** <#${channel.id}> has been moved.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to move channel.', ephemeral: true });
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
                if (channel.parentId === ENDED_GAMES_CATEGORY_ID) {
                    return interaction.reply({ content: '⚠ This game has already ended.', ephemeral: true });
                }

                await channel.setParent(ENDED_GAMES_CATEGORY_ID);
                await interaction.reply(`✅ **Game ended!** Channel archived.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to move channel.', ephemeral: true });
            }
        }
    }

    // -------------------------------
    // /setrole
    // -------------------------------
    if (commandName === 'setrole') {
        const role = options.getRole('role');
        requiredRoleId = role.id;
        await interaction.reply(`✅ The required role is now **${role.name}**.`);
    }

    // -------------------------------
    // /poll (NEW)
    // -------------------------------
    if (commandName === 'poll') {
        const roleName = options.getString('role');
        const duration = options.getInteger('duration') || 60;
        const maxResponses = options.getInteger('max_responses');
        const textChannel = options.getChannel('channel');

        if (!textChannel || !textChannel.isTextBased()) {
            return interaction.reply({ content: '❌ Please select a valid text channel.', ephemeral: true });
        }

        // Create or find role
        let role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            try {
                role = await guild.roles.create({
                    name: roleName,
                    color: 'FF9FF9',
                });

                await interaction.reply({ content: `✅ Created role **${roleName}**`, ephemeral: true });
            } catch (error) {
                console.error(error);
                return interaction.reply({ content: '❌ Failed to create role.', ephemeral: true });
            }
        } else {
            await interaction.reply({ content: `⚠ Role **${roleName}** already exists.`, ephemeral: true });
        }

        // Channel permissions
        try {
            await textChannel.permissionOverwrites.create(role, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });

            await interaction.followUp({ content: `🔧 Updated permissions for <#${textChannel.id}>.`, ephemeral: true });
        } catch (error) {
            return interaction.followUp({ content: '❌ Failed updating permissions.', ephemeral: true });
        }

        // -------------------------------
        // EMBED + BUTTONS
        // -------------------------------
        const embed = new EmbedBuilder()
            .setTitle("📢 Poll Started")
            .setDescription(
                `Click **Join** to get the **${roleName}** role and access <#${textChannel.id}>.\n\n` +
                `⏳ Ends in **${duration} seconds**` +
                (maxResponses ? ` • 🔢 Max: **${maxResponses}** users` : '')
            )
            .addFields(
                { name: "Participants", value: "0", inline: true },
                { name: "Status", value: "Open", inline: true }
            )
            .setTimestamp();

        const joinButton = new ButtonBuilder()
            .setCustomId("poll_join")
            .setLabel("✅ Join Poll")
            .setStyle(ButtonStyle.Success);

        const actionRow = new ActionRowBuilder().addComponents(joinButton);

        const pollMessage = await textChannel.send({
            embeds: [embed],
            components: [actionRow]
        });

        const joined = new Set();

        // Update embed helper
        async function updateEmbed(forceClosed = false) {
            const newEmbed = EmbedBuilder.from(embed)
                .setFields(
                    { name: "Participants", value: `${joined.size}`, inline: true },
                    { name: "Status", value: forceClosed ? "Closed" : "Open", inline: true }
                );

            await pollMessage.edit({
                embeds: [newEmbed],
                components: forceClosed ? [] : [actionRow]
            });
        }

        // Collect button clicks
        const collector = pollMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: duration * 1000
        });

        collector.on("collect", async btn => {
            if (btn.customId !== "poll_join") return;

            if (joined.has(btn.user.id)) {
                return btn.reply({ content: "You have already joined!", ephemeral: true });
            }

            joined.add(btn.user.id);

            const memberObj = await guild.members.fetch(btn.user.id);
            if (!memberObj.roles.cache.has(role.id)) {
                await memberObj.roles.add(role);
                memberObj.send(`✅ You joined the poll and received **${roleName}**!`).catch(() => {});
            }

            await btn.reply({ content: "You've joined the poll!", ephemeral: true });
            await updateEmbed();

            if (maxResponses && joined.size >= maxResponses) {
                collector.stop("max_reached");
            }
        });

        collector.on("end", async (_, reason) => {
            await updateEmbed(true);

            const mentions = [...joined].map(id => `<@${id}>`).join(" ") || "*No participants*";

            let closeText = `📢 **Poll ended!**\n👥 Participants: ${mentions}`;
            if (reason === "max_reached") closeText += `\n🔒 Max responses reached: **${maxResponses}**`;

            await textChannel.send(closeText);
        });
    }
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
