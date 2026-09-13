const ticketStore = require('./ticketStore');
const points = require('./points');
const { isStaff } = require('./permissions');

const CLOSE_POINTS = 2;
const RENAME_POINTS = 3;

async function closeChannel(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can close this.', ephemeral: true });
  }

  const meta = ticketStore.get(interaction.channel.id);
  if (!meta) {
    return interaction.reply({ content: 'This is not a ticket or application channel.', ephemeral: true });
  }

  const newTotal = points.addPoints(interaction.user.id, CLOSE_POINTS);
  ticketStore.remove(interaction.channel.id);

  await interaction.reply(
    `This channel is closing. +${CLOSE_POINTS} points awarded to ${interaction.user} (total: ${newTotal}). Deleting in 5 seconds...`
  );

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
  const newTotal = points.addPoints(interaction.user.id, RENAME_POINTS);

  await interaction.reply(
    `Channel renamed to "${sanitized}". +${RENAME_POINTS} points awarded to ${interaction.user} (total: ${newTotal}).`
  );
}

module.exports = { closeChannel, renameChannel, CLOSE_POINTS, RENAME_POINTS };
