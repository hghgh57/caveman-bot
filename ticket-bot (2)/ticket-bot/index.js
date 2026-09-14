require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
const cron = require('node-cron');

const config = require('./config');
const points = require('./utils/points');

const {
  closeChannel,
  claimTicket,
  unclaimTicket,
  handleRenameButton,
  handleRenameModalSubmit,
} = require('./utils/ticketActions');

const { handleTicketOpen } = require('./handlers/ticketHandlers');

const {
  handleApplicationSelect,
  handleApplicationAccept,
  handleApplicationAcceptReason,
  handleApplicationAcceptReasonModal,
  handleApplicationDeny,
  handleApplicationDenyReason,
  handleApplicationDenyReasonModal,
  handleApplicationOpenTicket,
} = require('./handlers/applicationHandlers');

const { handleLeaderboardRoleSelect } = require('./handlers/leaderboardHandlers');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Load slash commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, client => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {

    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return await command.execute(interaction);
    }

    // Buttons
    if (interaction.isButton()) {

      if (interaction.customId.startsWith('ticket_open_'))
        return await handleTicketOpen(interaction);

      if (interaction.customId === 'ticket_close_btn')
        return await closeChannel(interaction);

      if (interaction.customId === 'ticket_claim_btn')
        return await claimTicket(interaction);

      if (interaction.customId === 'ticket_unclaim_btn')
        return await unclaimTicket(interaction);

      if (interaction.customId === 'ticket_rename_btn')
        return await handleRenameButton(interaction);

      // Applications
      if (interaction.customId.startsWith('application_accept_reason:'))
        return await handleApplicationAcceptReason(interaction);

      if (interaction.customId.startsWith('application_accept:'))
        return await handleApplicationAccept(interaction);

      if (interaction.customId.startsWith('application_deny_reason:'))
        return await handleApplicationDenyReason(interaction);

      if (interaction.customId.startsWith('application_deny:'))
        return await handleApplicationDeny(interaction);

      if (interaction.customId.startsWith('application_open_ticket:'))
        return await handleApplicationOpenTicket(interaction);

      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {

      if (interaction.customId === 'ticket_rename_modal')
        return await handleRenameModalSubmit(interaction);

      if (interaction.customId.startsWith('application_accept_reason_modal:'))
        return await handleApplicationAcceptReasonModal(interaction);

      if (interaction.customId.startsWith('application_deny_reason_modal:'))
        return await handleApplicationDenyReasonModal(interaction);

      return;
    }

    // Dropdowns
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'application_select'
    ) {
      return await handleApplicationSelect(interaction);
    }

    if (
      interaction.isRoleSelectMenu() &&
      interaction.customId === 'leaderboard_role_select'
    ) {
      return await handleLeaderboardRoleSelect(interaction);
    }

  } catch (err) {
    console.error(err);

    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content: 'Something went wrong while handling that.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// Weekly leaderboard reset
cron.schedule(
  '0 1 * * 1',
  () => {
    points.resetAll();
    console.log('Weekly points reset.');
  },
  {
    timezone: config.timezone,
  }
);

// Railway token
client.login(process.env.TOKEN);
