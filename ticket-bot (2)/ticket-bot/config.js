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
  staffRoleId: '1534029589569998888',

  // Per-ticket-type settings. Keys must match the `id` values in
  // data/ticketCategories.js. Each one can go to its own category channel
  // and ping its own role. Leave pingRoleId as '' to only ping staffRoleId.
  ticketCategories: {
    support: {
      categoryId: '1534029665382170814',
      pingRoleId: '1534029589569998888',
    },
    staff_report: {
      categoryId: '1534029678682181703',
      pingRoleId: '1534029589569998888',
    },
    buy_sell_spawner: {
      categoryId: '1534029675804889108',
      pingRoleId: '1534029589569998888',
    },
    giveaway_claim: {
      categoryId: 'PUT_GIVEAWAY_CLAIM_CATEGORY_ID_HERE',
      pingRoleId: '1534029589569998888',
    },
    giveaway_sponsor: {
      categoryId: '1534029672407367690',
      pingRoleId: '1534029589569998888',
    },
  },

  // Per-application-type settings. Keys must match the keys in
  // data/applicationQuestions.js (staff_helper, builder).
  // - reviewChannelId: an EXISTING channel (NOT a category) where finished
  //   applications get posted with Accept/Decline buttons. Make this
  //   staff-only — applicants never see it, they answer questions over DM
  //   with the bot instead.
  // - pingRoleId: role pinged in reviewChannelId when a submission lands
  // - acceptedRoleId: role given to the applicant when Accepted (leave '' to skip)
  applicationCategories: {
    staff_helper: {
      reviewChannelId: '1534029928683798640',
      pingRoleId: '1534029586231332986',
      acceptedRoleId: '1535942602258522132',
    },
    builder: {
      reviewChannelId: '1534029932563529828',
      pingRoleId: '1534029586231332986',
      acceptedRoleId: '1535942667375087639',
    },
  },

  // Timezone for the weekly points reset (Monday 1:00 AM).
  timezone: 'Europe/Berlin',
};
