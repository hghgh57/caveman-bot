// Reads config from environment variables (Railway -> your service -> Variables tab).
// For local development, you can optionally create a .env file with the same
// names and it'll be picked up automatically if the "dotenv" package is installed.
try {
  require('dotenv').config();
} catch {
  // dotenv not installed - fine on Railway, where variables are injected directly.
}

module.exports = {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  // Role allowed to use /ticket-close, /ticket-rename, /point-leaderboard,
  // and pinged whenever a ticket/application opens.
  staffRoleId: process.env.STAFF_ROLE_ID,

  // Category channels that new ticket/application channels get created under.
  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  applicationCategoryId: process.env.APPLICATION_CATEGORY_ID || process.env.TICKET_CATEGORY_ID,

  // Timezone for the weekly points reset (Monday 1:00 AM).
  timezone: process.env.TIMEZONE || 'Europe/Berlin',
};
