module.exports = {
    name: 'media',
    alias: ['sticker', 's', 'ai', 'gpt', 'img', 'play'],
    execute: async (sock, msg, args) => {
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        const remoteJid = msg.key.remoteJid;

        // --- 1. AI CHAT (.ai) ---
        if (cmd === 'ai' || cmd === 'gpt') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Ask something! Ex: .ai Who is Ironman?' });
            try {
                const fetch = (await import('node-fetch')).default;
                const res = await fetch(`https://api.hercai.zaidrake.com/v2/hercai?question=${args.join(" ")}`);
                const json = await res.json();
                await sock.sendMessage(remoteJid, { text: `🤖 *AI:* ${json.reply}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '❌ AI Error.' });
            }
        }

        // --- 2. IMAGE GENERATOR (.img) ---
        if (cmd === 'img') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Give a prompt! Ex: .img cat in space' });
            try {
                // Using Pollinations AI (Free, No Key)
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(" "))}`;
                await sock.sendMessage(remoteJid, { 
                    image: { url: url }, 
                    caption: `🎨 Generated: ${args.join(" ")}` 
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '❌ Failed to generate image.' });
            }
        }

        // --- 3. SONG DOWNLOADER (.play) ---
        if (cmd === 'play') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Give a song name! Ex: .play Believer' });
            try {
                await sock.sendMessage(remoteJid, { text: '🔍 Searching...' });
                const fetch = (await import('node-fetch')).default;
                // Using a free music API
                const res = await fetch(`https://api.diiooffc.web.id/api/download/ytmp3?url=${encodeURIComponent(args.join(" "))}`);
                const json = await res.json();
                
                if (json.result && json.result.url) {
                    await sock.sendMessage(remoteJid, { 
                        audio: { url: json.result.url }, 
                        mimetype: 'audio/mp4', 
                        ptt: false 
                    }, { quoted: msg });
                } else {
                    throw new Error("No URL");
                }
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '❌ Could not download song. (API Limit)' });
            }
        }
        
        // --- 4. STICKER (Simple Reply for now) ---
        if (cmd === 'sticker' || cmd === 's') {
            await sock.sendMessage(remoteJid, { text: '❌ Sticker requires ffmpeg (Not installed on Render Free).' });
        }
    }
};
