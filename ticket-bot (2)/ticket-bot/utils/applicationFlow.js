const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const ticketStore = require('./ticketStore');

const QUESTION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes per question

function cancelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('application_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
}

function yesNoRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('application_yes').setLabel('Yes').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('application_no').setLabel('No').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('application_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
}

// Asks a single question in `channel` (the applicant's DM channel) and waits
// for `userId` to answer it, either by typing a message or (for yes/no
// questions) pressing a button. A Cancel button is always available underneath.
async function askQuestion(channel, userId, question) {
  if (question.type === 'yesno') {
    const qMsg = await channel.send({ content: question.text, components: [yesNoRow()] });

    const btnInteraction = await qMsg
      .awaitMessageComponent({
        filter: (i) =>
          i.user.id === userId &&
          ['application_yes', 'application_no', 'application_cancel'].includes(i.customId),
        time: QUESTION_TIMEOUT_MS,
      })
      .catch(() => null);

    await qMsg.edit({ components: [] }).catch(() => {});

    if (!btnInteraction) return { cancelled: true, timedOut: true };
    await btnInteraction.deferUpdate().catch(() => {});

    if (btnInteraction.customId === 'application_cancel') return { cancelled: true };
    return { answer: btnInteraction.customId === 'application_yes' ? 'Yes' : 'No' };
  }

  const qMsg = await channel.send({ content: question.text, components: [cancelRow()] });

  const messagePromise = channel
    .awaitMessages({ filter: (m) => m.author.id === userId, max: 1, time: QUESTION_TIMEOUT_MS })
    .then((collected) => ({ type: 'message', collected }));

  const cancelPromise = qMsg
    .awaitMessageComponent({
      filter: (i) => i.user.id === userId && i.customId === 'application_cancel',
      time: QUESTION_TIMEOUT_MS,
    })
    .then((i) => ({ type: 'cancel', i }))
    .catch(() => ({ type: 'timeout' }));

  const result = await Promise.race([messagePromise, cancelPromise]);
  await qMsg.edit({ components: [] }).catch(() => {});

  if (result.type === 'cancel') {
    await result.i.deferUpdate().catch(() => {});
    return { cancelled: true };
  }

  if (result.type === 'timeout') return { cancelled: true, timedOut: true };

  const msg = result.collected.first();
  if (!msg) return { cancelled: true, timedOut: true };
  return { answer: msg.content || '*(no text — attachment or empty message)*' };
}

// Walks the user through every question in `appConfig.questions` over DM,
// then posts a summary embed with Accept/Decline buttons into `reviewChannel`
// (an existing staff-only channel) for staff to act on.
//
// `opts`:
//   - reviewChannel: the guild channel to post the finished submission to
//   - pingRoleId: role to ping in reviewChannel when a submission lands (optional)
//   - appId: unique id for this application, used to tie the Accept/Decline
//            buttons back to the right applicant since many submissions can
//            share the same reviewChannel
async function runApplicationFlow(dmChannel, user, appConfig, opts) {
  const { reviewChannel, pingRoleId, appId } = opts;
  const answers = [];

  for (const question of appConfig.questions) {
    const result = await askQuestion(dmChannel, user.id, question);

    if (result.cancelled) {
      await dmChannel.send(
        result.timedOut
          ? 'This application timed out due to inactivity.'
          : 'This application was cancelled.'
      );
      ticketStore.remove(appId);
      return;
    }

    answers.push({ question: question.text, answer: result.answer });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${appConfig.label} — Submission`)
    .setColor(0x2b2d31)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setDescription(answers.map((a, i) => `**${i + 1}. ${a.question}**\n${a.answer}`).join('\n\n'))
    .setFooter({ text: `User ID: ${user.id}` })
    .setTimestamp();

  const decisionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`application_accept:${appId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`application_decline:${appId}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
  );

  await reviewChannel.send({
    content: pingRoleId ? `<@&${pingRoleId}>` : undefined,
    embeds: [embed],
    components: [decisionRow],
  });

  await dmChannel.send('Your application has been submitted. Staff will review it and follow up with you here.');
}

module.exports = { runApplicationFlow };
