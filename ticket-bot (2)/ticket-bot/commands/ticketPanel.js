const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const categories = require('../data/ticketCategories');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the ticket creation panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("Tickets")
      .setDescription(
`<:ticketcoupon:1268607173936676958> **Support**

> Open this if you want help or assistance with anything.

<:Scammer:1543384286407688193> **Staff Report**

> Open this if a staff / builder did something wrong.

<:Spawner1:1477329125437079582> **Buy/Sell Spawner**

> Open this if you want to buy/sell spawners.

<:Giveaway:1487968608607928352> **Giveaway Claim**

> Open this to claim a giveaway you won.

<:Giveaway:1487968608607928352> **Giveaway Sponsor**

> Open this if you want to sponsor a giveaway.`
      );

    const row = new ActionRowBuilder().addComponents(
      categories.map(c =>
        new ButtonBuilder()
          .setCustomId(`ticket_open_${c.id}`)
          .setLabel(c.label)
          .setEmoji(c.emoji)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: "Ticket panel posted.",
      ephemeral: true,
    });
  },
};
