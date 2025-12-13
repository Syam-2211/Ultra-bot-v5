module.exports = {
    name: 'admin',
    alias: ['kick', 'add', 'promote', 'demote', 'hidetag', 'tagall', 'tag'],
    execute: async (sock, msg, args, user, isSudo, isOwner) => {
        const remoteJid = msg.key.remoteJid;
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        
        if (!remoteJid.endsWith('@g.us')) return sock.sendMessage(remoteJid, { text: '❌ Groups only.' });
        
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);
        const sender = msg.key.participant;
        const isAdmin = groupAdmins.includes(sender) || isOwner;

        // 🛡️ CRITICAL CHECK: Make sure Bot is Admin first
        if (!isBotAdmin) return sock.sendMessage(remoteJid, { text: '❌ I need to be Admin first! Please promote me.' });
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
            // Tags everyone silently (Hidden mention)
            await sock.sendMessage(remoteJid, { 
                text: args.join(" ") || "Attention Everyone! 🔔", 
                mentions: groupMetadata.participants.map(a => a.id) 
            });
        }

        if (cmd === 'tagall' || cmd === 'tag') {
            // Tags everyone visibly (List)
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
