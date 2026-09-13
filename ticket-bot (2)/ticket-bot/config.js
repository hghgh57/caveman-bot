// Only the token / client id / guild id come from Railway (Variables tab).
// Everything else is set directly below — edit the values in this file.
try {
  require('dotenv').config();
} catch {
  // dotenv not installed - fine on Railway, where variables are injected directly.
}

module.exports = {
  // ---- These three come from Railway's Variables tab ----
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  // ---- Everything below: edit these values directly ----

  // Role allowed to use /ticket-close, /ticket-rename, /point-leaderboard,
  // and accept/decline applications. Also always gets access to every
  // ticket/application channel regardless of the per-type settings below.
  staffRoleId: 'PUT_STAFF_ROLE_ID_HERE',

  // Per-ticket-type settings. Keys must match the `id` values in
  // data/ticketCategories.js. Each one can go to its own category channel
  // and ping its own role. Leave pingRoleId as '' to only ping staffRoleId.
  ticketCategories: {
    support: {
      categoryId: 'PUT_SUPPORT_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_SUPPORT_PING_ROLE_ID_HERE',
    },
    staff_report: {
      categoryId: 'PUT_STAFF_REPORT_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_STAFF_REPORT_PING_ROLE_ID_HERE',
    },
    buy_sell_spawner: {
      categoryId: 'PUT_BUY_SELL_SPAWNER_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_BUY_SELL_SPAWNER_PING_ROLE_ID_HERE',
    },
    giveaway_claim: {
      categoryId: 'PUT_GIVEAWAY_CLAIM_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_GIVEAWAY_CLAIM_PING_ROLE_ID_HERE',
    },
    giveaway_sponsor: {
      categoryId: 'PUT_GIVEAWAY_SPONSOR_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_GIVEAWAY_SPONSOR_PING_ROLE_ID_HERE',
    },
  },

  // Per-application-type settings. Keys must match the keys in
  // data/applicationQuestions.js (staff_helper, builder).
  // - categoryId: which category channel the application channel is created under
  // - pingRoleId: which role gets pinged when someone opens that application
  // - acceptedRoleId: role given to the applicant when Accepted (leave '' to skip)
  applicationCategories: {
    staff_helper: {
      categoryId: 'PUT_STAFF_APP_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_STAFF_APP_PING_ROLE_ID_HERE',
      acceptedRoleId: 'PUT_STAFF_ACCEPTED_ROLE_ID_HERE',
    },
    builder: {
      categoryId: 'PUT_BUILDER_APP_CATEGORY_ID_HERE',
      pingRoleId: 'PUT_BUILDER_APP_PING_ROLE_ID_HERE',
      acceptedRoleId: 'PUT_BUILDER_ACCEPTED_ROLE_ID_HERE',
    },
  },

  // Timezone for the weekly points reset (Monday 1:00 AM).
  timezone: 'Europe/Berlin',
};
