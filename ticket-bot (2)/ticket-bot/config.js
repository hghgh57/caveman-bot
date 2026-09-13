// Fill these in directly. No .env / Railway variables needed.

module.exports = {
  // Discord Developer Portal -> Bot -> Reset Token
  token: 'PUT_YOUR_BOT_TOKEN_HERE',

  // Discord Developer Portal -> General Information -> Application ID
  clientId: 'PUT_YOUR_CLIENT_ID_HERE',

  // Right-click your server icon (Developer Mode on) -> Copy Server ID
  guildId: 'PUT_YOUR_GUILD_ID_HERE',

  // Role allowed to use /ticket-close, /ticket-rename, /point-leaderboard,
  // and pinged whenever a ticket/application opens.
  // Right-click the role -> Copy Role ID
  staffRoleId: 'PUT_YOUR_STAFF_ROLE_ID_HERE',

  // Category channels new ticket/application channels get created under.
  // Right-click a category -> Copy Channel ID. Leave as '' to create at top level.
  ticketCategoryId: '',
  applicationCategoryId: '', // leave '' to fall back to ticketCategoryId below

  // Timezone for the weekly points reset (Monday 1:00 AM).
  timezone: 'Europe/Berlin',
};

// Falls back to ticketCategoryId if applicationCategoryId is left blank.
module.exports.applicationCategoryId = module.exports.applicationCategoryId || module.exports.ticketCategoryId;
