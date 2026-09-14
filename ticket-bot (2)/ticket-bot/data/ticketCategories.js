// The 5 ticket categories shown as grey buttons on the ticket panel.
// `questions` (optional) are asked in a Discord form (modal) as soon as
// someone presses the button — answers get baked into the ticket's embed.
// `notes` (optional) is just an FYI line shown in the ticket, not a question.
module.exports = [
  {
    id: 'support',
    emoji: '<:ticketcoupon:1268607173936676958>',
    label: 'Support',
    description: 'Open this if you want help or assistance with anything.',
    questions: ['What do you need help with?', "What's your IGN?"],
  },
  {
    id: 'staff_report',
    emoji: '<:Scammer:1543384286407688193>',
    label: 'Staff Report',
    description: 'Open this if a staff / builder did something wrong.',
    questions: [
      'Are you reporting a staff or a member?',
      'What did they do?',
      'Do you have any proof?',
    ],
  },
  {
    id: 'buy_sell_spawner',
    emoji: '<:Spawner1:1477329125437079582>',
    label: 'Buy/Sell Spawner',
    description: 'Open this if you want to buy/sell spawners.',
    notes: 'Only buy/sell with users who have spawner perms.',
    questions: ['How many spawners are you buying/selling?'],
     questions: ['Only buy/sell spawners with users who have spawner perms!'],
  },
  {
    id: 'giveaway_claim',
    emoji: '<:Giveaway:1487968608607928352>',
    label: 'Giveaway Claim',
    description: 'Open this to claim a giveaway you won.',
    questions: ['How much have you won?', 'Who hosted the giveaway?'],
  },
  {
    id: 'giveaway_sponsor',
    emoji: '<:Giveaway:1487968608607928352>',
    label: 'Giveaway Sponsor',
    description: 'Open this if you want to sponsor a giveaway.',
    questions: ['How much do you want to sponsor?', "What's your IGN?"],
  },
];
