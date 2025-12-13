module.exports = {
    name: 'admin',
    alias: ['kick', 'add', 'promote', 'demote', 'hidetag', 'mode'],
    execute: async (sock, msg, args, user, isSudo, isOwner) => {
        const { getContentType } = require('@whiskeysockets/baileys');
        const remoteJid = msg.key.remoteJid;
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        
        // 1. MODE SWITCH (Owner Only)
        if (cmd === 'mode') {
            if (!isOwner) return sock.sendMessage(remoteJid, { text: '❌ Owner only.' });
            const config = require('../config');
            config.workMode = args[0] === 'private' ? 'private' : 'public';
            return sock.sendMessage(remoteJid, { text: `✅ Mode switched to: ${config.workMode}` });
        }

        // 2. GROUP CHECKS
        if (!remoteJid.endsWith('@g.us')) return sock.sendMessage(remoteJid, { text: '❌ This command is for Groups only.' });
        
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);
        const sender = msg.key.participant;
        const isAdmin = groupAdmins.includes(sender) || isOwner;

        if (!isBotAdmin) return sock.sendMessage(remoteJid, { text: '❌ I need to be Admin first!' });
        if (!isAdmin) return sock.sendMessage(remoteJid, { text: '❌ You must be an Admin.' });

        // 3. GET TARGET USER
        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     msg.message.extendedTextMessage?.contextInfo?.participant || 
                     args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (cmd === 'kick') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
            await sock.sendMessage(remoteJid, { text: '👋 Banned!' });
        }
        
        if (cmd === 'add') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'add');
            await sock.sendMessage(remoteJid, { text: '👋 Added!' });
        }

        if (cmd === 'promote') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'promote');
            await sock.sendMessage(remoteJid, { text: '✅ Promoted to Admin' });
        }

        if (cmd === 'demote') {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'demote');
            await sock.sendMessage(remoteJid, { text: '⬇️ Demoted from Admin' });
        }
        
        if (cmd === 'hidetag') {
            await sock.sendMessage(remoteJid, { text: args.join(" ") || "Attention!", mentions: groupMetadata.participants.map(a => a.id) });
        }
    }
};
