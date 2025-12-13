module.exports = {
    name: 'admin',
    alias: ['kick', 'add', 'promote', 'demote', 'hidetag', 'tagall', 'tag'],
    execute: async (sock, msg, args, user, isSudo, isOwner) => {
        const remoteJid = msg.key.remoteJid;
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        
        if (!remoteJid.endsWith('@g.us')) return sock.sendMessage(remoteJid, { text: '❌ Groups only.' });
        
        const groupMetadata = await sock.groupMetadata(remoteJid);
        
        // 🛡️ SMART ID CHECK (Fixes the "I need to be Admin" bug)
        // We strip the ":" part from both the bot and the admins to match them perfectly.
        const botId = sock.user.id.split(':')[0]; 
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id.split(':')[0]);
        const isBotAdmin = groupAdmins.includes(botId);
        
        const sender = msg.key.participant.split(':')[0];
        const isAdmin = groupAdmins.includes(sender) || isOwner;

        if (!isBotAdmin) return sock.sendMessage(remoteJid, { text: '❌ I need to be Admin first! (Promote me and try again)' });
        if (!isAdmin) return sock.sendMessage(remoteJid, { text: '❌ You must be an Admin.' });

        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     msg.message.extendedTextMessage?.contextInfo?.participant || 
                     args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        // --- COMMANDS ---
        if (cmd === 'kick') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
            await sock.sendMessage(remoteJid, { text: '👋 Bye!' });
        }
        
        if (cmd === 'add') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'add');
            await sock.sendMessage(remoteJid, { text: '👋 Added!' });
        }

        if (cmd === 'promote') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'promote');
            await sock.sendMessage(remoteJid, { text: '✅ Promoted!' });
        }

        if (cmd === 'demote') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'demote');
            await sock.sendMessage(remoteJid, { text: '⬇️ Demoted.' });
        }
        
        if (cmd === 'hidetag') {
            await sock.sendMessage(remoteJid, { 
                text: args.join(" ") || "Attention!", 
                mentions: groupMetadata.participants.map(a => a.id) 
            });
        }

        // ✅ NEW TAGALL COMMAND
        if (cmd === 'tagall' || cmd === 'tag') {
            let text = `📢 *EVERYONE TAG*\n\nMessage: ${args.join(" ") || "Hello!"}\n\n`;
            for (let mem of groupMetadata.participants) {
                text += `@${mem.id.split('@')[0]}\n`;
            }
            await sock.sendMessage(remoteJid, { 
                text: text, 
                mentions: groupMetadata.participants.map(a => a.id) 
            });
        }
    }
};
