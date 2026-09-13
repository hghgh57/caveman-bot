const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const ticketStore = require('../utils/ticketStore');
const applicationQuestions = require('../data/applicationQuestions');
const { runApplicationFlow } = require('../utils/applicationFlow');
const { isStaff } = require('../utils/permissions');

async function handleApplicationSelect(interaction) {
  const value = interaction.values[0];
  const appConfig = applicationQuestions[value];
  if (!appConfig) {
    return interaction.reply({ content: 'Unknown application type.', ephemeral: true });
  }

  const existing = ticketStore.findOpenByUser(interaction.user.id, value);
  if (existing) {
    return interaction.reply({
      content: `You already have an open application: <#${existing[0]}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const channelName = `${appConfig.prefix}-${interaction.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 90);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  if (config.staffRoleId) {
    overwrites.push({
      id: config.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.applicationCategoryId || undefined,
    permissionOverwrites: overwrites,
  });

  ticketStore.add(channel.id, {
    type: 'application',
    category: value,
    openerId: interaction.user.id,
    openedAt: Date.now(),
  });

  await interaction.editReply({ content: `Your application has been started: ${channel}` });

  const introEmbed = new EmbedBuilder()
    .setTitle(appConfig.label)
    .setDescription(
      `${interaction.user}, you'll be asked ${appConfig.questions.length} questions one at a time. Just type your answer in this channel to move to the next one, or press Cancel at any point to stop.`
    )
    .setColor(0x2b2d31);

  await channel.send({
    content: `${interaction.user}${config.applicationPingRoleId ? ` <@&${config.applicationPingRoleId}>` : ''}`,
    embeds: [introEmbed],
  });

  runApplicationFlow(channel, interaction.user, appConfig).catch((err) => {
    console.error('Application flow error:', err);
  });
}

// Disables the Accept/Decline buttons on the message they were clicked from,
// so staff can't double-click and double-assign roles / double-DM.
async function disableDecisionButtons(interaction, resultLabel) {
  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('application_accept')
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('application_decline')
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );
  await interaction.message
    .edit({ content: `**${resultLabel}** by ${interaction.user}`, components: [disabledRow] })
    .catch(() => {});
}

async function handleApplicationAccept(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can accept/decline applications.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta || meta.type !== 'application') {
    return interaction.reply({ content: 'This is not an application channel.', ephemeral: true });
  }

  await interaction.deferReply();

  const roleId = config.acceptedRoles ? config.acceptedRoles[meta.category] : undefined;
  let roleNote = '';

  if (roleId) {
    try {
      const member = await interaction.guild.members.fetch(meta.openerId);
      await member.roles.add(roleId);
      roleNote = ` <@&${roleId}> has been given to <@${meta.openerId}>.`;
    } catch (err) {
      console.error('Failed to add accepted role:', err);
      roleNote = ' (Could not assign the accepted role automatically — check bot role position/permissions.)';
    }
  }

  await interaction.editReply(`✅ Application accepted by ${interaction.user}, <@${meta.openerId}>!${roleNote}`);
  await disableDecisionButtons(interaction, 'Accepted');
}

async function handleApplicationDecline(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can accept/decline applications.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta || meta.type !== 'application') {
    return interaction.reply({ content: 'This is not an application channel.', ephemeral: true });
  }

  await interaction.reply(`❌ Application declined by ${interaction.user}, <@${meta.openerId}>.`);
  await disableDecisionButtons(interaction, 'Declined');
}

module.exports = { handleApplicationSelect, handleApplicationAccept, handleApplicationDecline };
