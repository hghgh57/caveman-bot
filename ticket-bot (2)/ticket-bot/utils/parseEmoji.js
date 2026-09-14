// ButtonBuilder#setEmoji() needs a unicode emoji character OR an object
// ({ id, name, animated }) for custom emojis — it does NOT understand the
// <:name:id> / <a:name:id> tag format you get when you type an emoji in
// Discord and copy it. Passed a tag string directly, discord.js can't
// resolve it, so the button falls back to showing the raw name (":name:")
// instead of rendering the emoji.
//
// This works everywhere the tag is just sitting in message/embed text
// (like /embed's description) because Discord's client parses that tag
// itself when rendering text — no help from the bot needed there. Buttons
// go through the separate emoji field, so we have to parse it ourselves.
//
// parseEmoji('<:ticketcoupon:1268607173936676958>')
//   -> { id: '1268607173936676958', name: 'ticketcoupon', animated: false }
// parseEmoji('✋') -> '✋' (unicode emoji, passed through as-is)
function parseEmoji(emoji) {
  if (!emoji) return emoji;

  const match = emoji.match(/^<(a)?:(\w+):(\d+)>$/);
  if (!match) return emoji; // not a custom-emoji tag — treat as unicode

  const [, animated, name, id] = match;
  return { id, name, animated: Boolean(animated) };
}

module.exports = { parseEmoji };
