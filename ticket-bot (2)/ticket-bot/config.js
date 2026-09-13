require('dotenv').config();

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
