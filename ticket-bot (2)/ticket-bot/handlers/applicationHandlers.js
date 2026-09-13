const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');
const ticketStore = require('../utils/ticketStore');
const applicationQuestions = require('../data/applicationQuestions');
const { runApplicationFlow } = require('../utils/applicationFlow');

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

  await channel.send({ content: `${interaction.user}`, embeds: [introEmbed] });

  runApplicationFlow(channel, interaction.user, appConfig).catch((err) => {
    console.error('Application flow error:', err);
  });
}

module.exports = { handleApplicationSelect };
