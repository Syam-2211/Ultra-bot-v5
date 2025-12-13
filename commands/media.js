module.exports = {
    name: 'media',
    alias: ['sticker', 's', 'ai', 'gpt', 'img', 'play'],
    execute: async (sock, msg, args) => {
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        const remoteJid = msg.key.remoteJid;

        // --- 1. AI CHAT (Switched to BK9 API - More Stable) ---
        if (cmd === 'ai' || cmd === 'gpt') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Ask something! Ex: .ai Who is Ironman?' });
            try {
                const fetch = (await import('node-fetch')).default;
                const res = await fetch(`https://bk9.fun/ai/chatgpt?q=${encodeURIComponent(args.join(" "))}`);
                const json = await res.json();
                if (json.BK9) {
                    await sock.sendMessage(remoteJid, { text: `🤖 *AI:* ${json.BK9}` }, { quoted: msg });
                } else {
                    throw new Error("No response");
                }
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '❌ AI Busy. Try again later.' });
            }
        }

        // --- 2. IMAGE GENERATOR ---
        if (cmd === 'img') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Give a prompt! Ex: .img cat in space' });
            try {
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(" "))}`;
                await sock.sendMessage(remoteJid, { 
                    image: { url: url }, 
                    caption: `🎨 Generated: ${args.join(" ")}` 
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '❌ Failed to generate image.' });
            }
        }

        // --- 3. SONG DOWNLOADER (Switched to Siputzx API) ---
        if (cmd === 'play') {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '❌ Give a song name! Ex: .play Believer' });
            try {
                await sock.sendMessage(remoteJid, { text: '🔍 Searching & Downloading...' });
                const fetch = (await import('node-fetch')).default;
                
                const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(args.join(" "))}`);
                const json = await res.json();

                if (json.data && json.data.dl) {
                     await sock.sendMessage(remoteJid, { 
                        audio: { url: json.data.dl }, 
                        mimetype: 'audio/mp4', 
                        ptt: false 
                    }, { quoted: msg });
                } else {
                    throw new Error("No DL Link");
                }
            } catch (e) {
                console.log(e);
                await sock.sendMessage(remoteJid, { text: '❌ Song not found or Server overloaded.' });
            }
        }
        
        // --- 4. STICKER ---
        if (cmd === 'sticker' || cmd === 's') {
            await sock.sendMessage(remoteJid, { text: '❌ Sticker feature requires FFMPEG (Not available on Render Free).' });
        }
    }
};
