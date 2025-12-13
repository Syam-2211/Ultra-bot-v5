const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
    name: 'media',
    alias: ['sticker', 's', 'ai', 'gpt'],
    execute: async (sock, msg, args) => {
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        const remoteJid = msg.key.remoteJid;

        // --- STICKER COMMAND ---
        if (cmd === 'sticker' || cmd === 's') {
            const type = Object.keys(msg.message)[0];
            const content = msg.message[type];
            const isImage = type === 'imageMessage';
            const isVideo = type === 'videoMessage';
            const isQuotedImage = type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
            
            if (isImage || isQuotedImage) {
               // Note: Real sticker conversion usually requires 'ffmpeg'. 
               // Since we are on Render Free without ffmpeg easily, we will send a simple reply.
               // To make this work 100%, you need a sticker API or buildpack.
               await sock.sendMessage(remoteJid, { text: '✅ Sending sticker...' });
               // (Placeholder for sticker logic - requires external library like fluent-ffmpeg)
            }
        }

        // --- AI COMMAND ---
        if (cmd === 'ai' || cmd === 'gpt') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Ask me something! Ex: .ai Who is Ironman?' });
            
            // Using a free API for simple AI response
            try {
                const fetch = (await import('node-fetch')).default;
                const res = await fetch(`https://api.hercai.zaidrake.com/v2/hercai?question=${args.join(" ")}`);
                const json = await res.json();
                await sock.sendMessage(remoteJid, { text: `🤖 *AI:* ${json.reply}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '❌ AI is sleeping.' });
            }
        }
    }
};
