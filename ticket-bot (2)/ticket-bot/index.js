require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
const cron = require('node-cron');

const config = require('./config');
const points = require('./utils/points');
const { closeChannel } = require('./utils/ticketActions');
const { handleTicketOpen } = require('./handlers/ticketHandlers');
const {
  handleApplicationSelect,
  handleApplicationAccept,
  handleApplicationDecline,
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
  // Needed so DM channels/messages arrive properly — applications are now
  // answered over DM instead of in a per-applicant guild channel.
  partials: [Partials.Channel, Partials.Message],
});

// Load slash commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return await command.execute(interaction);
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_open_')) {
        return await handleTicketOpen(interaction);
      }
      if (interaction.customId === 'ticket_close_btn') {
        return await closeChannel(interaction);
      }
      if (interaction.customId.startsWith('application_accept:')) {
        return await handleApplicationAccept(interaction);
      }
      if (interaction.customId.startsWith('application_decline:')) {
        return await handleApplicationDecline(interaction);
      }
      // application_yes / application_no / application_cancel buttons are
      // consumed directly by the awaitMessageComponent collectors inside
      // utils/applicationFlow.js — nothing to do for them here.
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'application_select') {
      return await handleApplicationSelect(interaction);
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === 'leaderboard_role_select') {
      return await handleLeaderboardRoleSelect(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: 'Something went wrong while handling that.', ephemeral: true })
        .catch(() => {});
    }
  }
});

// Weekly points reset — every Monday at 1:00 AM in the configured timezone.
cron.schedule(
  '0 1 * * 1',
  () => {
    points.resetAll();
    console.log('[Points] Weekly leaderboard has been reset.');
  },
  { timezone: config.timezone }
);

client.login(config.token);
