const { ChannelType, PermissionFlagsBits } = require('discord.js');

// Creates a private text channel visible only to `openerId` plus whichever
// roles are passed in `roleIds` (falsy/duplicate entries are dropped).
// Returns `rolesWithAccess`, the deduped role id list that was actually
// granted access — this gets saved on the ticket's meta so a later
// claim/unclaim knows exactly which role overwrites to touch.
async function createPrivateChannel({ guild, name, parentId, openerId, roleIds }) {
  const rolesWithAccess = [...new Set((roleIds || []).filter(Boolean))];

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: openerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...rolesWithAccess.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  const channel = await guild.channels.create({
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90),
    type: ChannelType.GuildText,
    parent: parentId || undefined,
    permissionOverwrites: overwrites,
  });

  return { channel, rolesWithAccess };
}

module.exports = { createPrivateChannel };
