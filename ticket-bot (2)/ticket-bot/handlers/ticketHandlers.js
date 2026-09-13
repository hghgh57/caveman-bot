const {
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');
const ticketStore = require('../utils/ticketStore');
const categories = require('../data/ticketCategories');

async function handleTicketOpen(interaction) {
  const categoryId = interaction.customId.replace('ticket_open_', '');
  const categoryDef = categories.find((c) => c.id === categoryId);
  if (!categoryDef) {
    return interaction.reply({ content: 'Unknown ticket category.', ephemeral: true });
  }

  const existing = ticketStore.findOpenByUser(interaction.user.id, categoryId);
  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket for this: <#${existing[0]}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const catCfg = config.ticketCategories[categoryId] || {};
  const pingRoleId = catCfg.pingRoleId || config.staffRoleId;

  const channelName = `${categoryDef.id.replace(/_/g, '-')}-${interaction.user.username}`
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
  if (pingRoleId && pingRoleId !== config.staffRoleId) {
    overwrites.push({
      id: pingRoleId,
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
    parent: catCfg.categoryId || undefined,
    permissionOverwrites: overwrites,
  });

  ticketStore.add(channel.id, {
    type: 'ticket',
    category: categoryId,
    openerId: interaction.user.id,
    openedAt: Date.now(),
  });

  const embed = new EmbedBuilder()
    .setTitle(`${categoryDef.emoji} ${categoryDef.label}`)
    .setDescription(`${interaction.user}, thanks for opening a ticket.\n\n${categoryDef.description}\n\nStaff will be with you shortly.`)
    .setColor(0x2b2d31);

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_btn').setLabel('Close Ticket').setStyle(ButtonStyle.Secondary)
  );

  const pings = [`${interaction.user}`];
  if (pingRoleId) pings.push(`<@&${pingRoleId}>`);

  await channel.send({
    content: pings.join(' '),
    embeds: [embed],
    components: [closeRow],
  });

  await interaction.editReply({ content: `Your ticket has been created: ${channel}` });
}

module.exports = { handleTicketOpen };
