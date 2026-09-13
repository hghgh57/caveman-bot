const crypto = require('crypto');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
      content: 'You already have an open application of this type — check your DMs with the bot to continue it.',
      ephemeral: true,
    });
  }

  const appCfg = config.applicationCategories[value] || {};
  if (!appCfg.reviewChannelId) {
    return interaction.reply({
      content: "This application type isn't fully set up yet (no review channel configured) — ask an admin to check config.js.",
      ephemeral: true,
    });
  }

  const reviewChannel = await interaction.client.channels.fetch(appCfg.reviewChannelId).catch(() => null);
  if (!reviewChannel) {
    return interaction.reply({
      content: "The review channel for this application type couldn't be found — ask an admin to check config.js.",
      ephemeral: true,
    });
  }

  const introEmbed = new EmbedBuilder()
    .setTitle(appConfig.label)
    .setDescription(
      `You'll be asked ${appConfig.questions.length} questions one at a time. Just type your answer here to move to the next one, or press Cancel at any point to stop.`
    )
    .setColor(0x2b2d31);

  let dmChannel;
  try {
    dmChannel = await interaction.user.createDM();
    await dmChannel.send({ embeds: [introEmbed] });
  } catch (err) {
    return interaction.reply({
      content: "I couldn't DM you to start the application — please enable direct messages from server members in your Privacy Settings and try again.",
      ephemeral: true,
    });
  }

  await interaction.reply({ content: "Check your DMs — I've started your application there!", ephemeral: true });

  const appId = crypto.randomUUID();
  ticketStore.add(appId, {
    type: 'application',
    category: value,
    openerId: interaction.user.id,
    openedAt: Date.now(),
  });

  runApplicationFlow(dmChannel, interaction.user, appConfig, {
    reviewChannel,
    pingRoleId: appCfg.pingRoleId,
    appId,
  }).catch((err) => {
    console.error('Application flow error:', err);
  });
}

// Disables the Accept/Decline buttons on the message they were clicked from,
// so staff can't double-click and double-assign roles / double-DM.
async function disableDecisionButtons(interaction, resultLabel) {
  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('application_accept_done').setLabel('Accept').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('application_decline_done').setLabel('Decline').setStyle(ButtonStyle.Danger).setDisabled(true)
  );
  await interaction.message
    .edit({ content: `**${resultLabel}** by ${interaction.user}`, components: [disabledRow] })
    .catch(() => {});
}

function getAppId(interaction) {
  return interaction.customId.split(':')[1];
}

async function handleApplicationAccept(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can accept/decline applications.', ephemeral: true });
  }

  const appId = getAppId(interaction);
  const meta = ticketStore.get(appId);
  if (!meta || meta.type !== 'application') {
    return interaction.reply({ content: 'This application is no longer available (already handled, or the bot restarted).', ephemeral: true });
  }

  await interaction.deferReply();

  const appCfg = config.applicationCategories[meta.category] || {};
  const roleId = appCfg.acceptedRoleId;
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
  ticketStore.remove(appId);

  try {
    const applicant = await interaction.client.users.fetch(meta.openerId);
    await applicant.send('🎉 Your application has been **accepted**! Staff will follow up if there are next steps.');
  } catch {
    // Applicant has DMs closed — nothing more we can do.
  }
}

async function handleApplicationDecline(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'Only staff can accept/decline applications.', ephemeral: true });
  }

  const appId = getAppId(interaction);
  const meta = ticketStore.get(appId);
  if (!meta || meta.type !== 'application') {
    return interaction.reply({ content: 'This application is no longer available (already handled, or the bot restarted).', ephemeral: true });
  }

  await interaction.reply(`❌ Application declined by ${interaction.user}, <@${meta.openerId}>.`);
  await disableDecisionButtons(interaction, 'Declined');
  ticketStore.remove(appId);

  try {
    const applicant = await interaction.client.users.fetch(meta.openerId);
    await applicant.send("Your application was **declined**. You're welcome to apply again in the future.");
  } catch {
    // Applicant has DMs closed — nothing more we can do.
  }
}

module.exports = { handleApplicationSelect, handleApplicationAccept, handleApplicationDecline };
