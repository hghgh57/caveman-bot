const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const ticketStore = require('./ticketStore');
const { isStaff } = require('./permissions');
const { buildTranscript } = require('./transcript');

// This role always keeps SendMessages in a ticket, even after it's claimed
// and every other role gets locked out.
const ALWAYS_CAN_TYPE_ROLE_ID = '1534029586231332986';

async function closeChannel(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can close this.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta) {
    return interaction.reply({ content: 'This is not a ticket or application channel.', ephemeral: true });
  }

  await interaction.reply(`${interaction.user} has closed this ticket, making transcript...`);

  let transcript;
  try {
    transcript = await buildTranscript(interaction.channel);
  } catch (err) {
    console.error('Failed to build transcript:', err);
  }

  if (transcript && meta.openerId) {
    try {
      const opener = await interaction.client.users.fetch(meta.openerId);
      await opener.send({
        content: `Here's a transcript of your ticket **#${interaction.channel.name}**, closed by ${interaction.user.tag}.`,
        files: [transcript],
      });
    } catch (err) {
      console.error('Failed to DM transcript to ticket opener:', err);
    }
  }

  ticketStore.remove(interaction.channel.id);

  await interaction.followUp('Deleting in 5 seconds...');

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 5000);
}

async function renameChannel(interaction, newName) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can rename this.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta) {
    return interaction.reply({ content: 'This is not a ticket or application channel.', ephemeral: true });
  }

  const sanitized = newName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 90);

  await interaction.channel.setName(sanitized);

  await interaction.reply(`Channel renamed to "${sanitized}".`);
}

// Strips the footer off an embed and returns a fresh EmbedBuilder — used so
// unclaiming removes the "Claimed by" note that claiming added.
function withoutFooter(embed) {
  if (!embed) return null;
  const data = embed.toJSON();
  delete data.footer;
  return EmbedBuilder.from(data);
}

// Button rows shown on a ticket message. Claim Ticket is green (Success),
// Rename Ticket is blurple (Primary), Close Ticket is red (Danger) with a
// lock emoji. Claim Ticket flips to Unclaim Ticket (grey) once claimed.
function claimedRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_unclaim_btn')
      .setLabel('Unclaim Ticket')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket_rename_btn')
      .setLabel('Rename Ticket')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_close_btn')
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function unclaimedRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim_btn')
      .setLabel('Claim Ticket')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_rename_btn')
      .setLabel('Rename Ticket')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_close_btn')
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

// Claiming a ticket locks SendMessages on every role that normally has
// access to it (the staff role + that category's ping role), then grants
// SendMessages back to just the claiming staff member. Administrators are
// unaffected since Discord's Administrator permission bypasses channel
// overwrites entirely, the ticket opener's own overwrite is never touched so
// they can keep talking, and ALWAYS_CAN_TYPE_ROLE_ID is skipped entirely so
// that role can always type even in a claimed ticket.
async function claimTicket(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta || meta.type !== 'ticket') {
    return interaction.reply({ content: 'This channel cannot be claimed.', ephemeral: true });
  }

  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  if (meta.claimedBy && meta.claimedBy !== interaction.user.id && !isAdmin) {
    return interaction.reply({
      content: `This ticket is already claimed by <@${meta.claimedBy}>.`,
      ephemeral: true,
    });
  }

  const roleIds = meta.rolesWithAccess || [];
  for (const roleId of roleIds) {
    if (roleId === ALWAYS_CAN_TYPE_ROLE_ID) continue; // this role always keeps access
    await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false }).catch(() => {});
  }
  await interaction.channel.permissionOverwrites
    .edit(interaction.user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    })
    .catch(() => {});

  ticketStore.update(interaction.channel.id, { claimedBy: interaction.user.id });

  const embed = interaction.message.embeds[0]
    ? EmbedBuilder.from(interaction.message.embeds[0]).setFooter({ text: `Claimed by ${interaction.user.tag}` })
    : null;

  await interaction.update({
    embeds: embed ? [embed] : interaction.message.embeds,
    components: [claimedRow()],
  });
  await interaction.followUp({
    content: `🔒 Ticket claimed by ${interaction.user} — other staff can no longer type here (admins still can).`,
  });
}

async function unclaimTicket(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can unclaim tickets.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta || meta.type !== 'ticket' || !meta.claimedBy) {
    return interaction.reply({ content: 'This ticket is not currently claimed.', ephemeral: true });
  }

  const isClaimer = meta.claimedBy === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isClaimer && !isAdmin) {
    return interaction.reply({
      content: `Only <@${meta.claimedBy}> (or an admin) can unclaim this ticket.`,
      ephemeral: true,
    });
  }

  const roleIds = meta.rolesWithAccess || [];
  for (const roleId of roleIds) {
    await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: true }).catch(() => {});
  }
  await interaction.channel.permissionOverwrites.delete(meta.claimedBy).catch(() => {});

  ticketStore.update(interaction.channel.id, { claimedBy: null });

  const embed = withoutFooter(interaction.message.embeds[0]);

  await interaction.update({
    embeds: embed ? [embed] : interaction.message.embeds,
    components: [unclaimedRow()],
  });
  await interaction.followUp({
    content: `🔓 Ticket unclaimed by ${interaction.user} — staff can type here again.`,
  });
}

// Rename Ticket button — opens a small modal asking for the new name, since
// buttons can't collect text input directly. The modal submit calls the same
// renameChannel() used by /ticket-rename and /rename, so behavior stays
// identical no matter how staff trigger a rename.
function renameModal() {
  const modal = new ModalBuilder().setCustomId('ticket_rename_modal').setTitle('Rename Ticket');
  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('New channel name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(90);
  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
  return modal;
}

async function handleRenameButton(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can rename this.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta) {
    return interaction.reply({ content: 'This is not a ticket or application channel.', ephemeral: true });
  }

  await interaction.showModal(renameModal());
}

async function handleRenameModalSubmit(interaction) {
  const newName = interaction.fields.getTextInputValue('name');
  await renameChannel(interaction, newName);
}

// /ticket-add user:<user> — staff only, adds someone to whatever ticket or
// application-ticket channel the command is run in.
async function addUserToTicket(interaction, user) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can add someone to a ticket.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta) {
    return interaction.reply({ content: 'This is not a ticket or application channel.', ephemeral: true });
  }

  await interaction.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  await interaction.reply(`${user} has been added to this ticket by ${interaction.user}.`);
}

module.exports = {
  closeChannel,
  renameChannel,
  claimTicket,
  unclaimTicket,
  handleRenameButton,
  handleRenameModalSubmit,
  addUserToTicket,
  claimedRow,
  unclaimedRow,
};
