module.exports = {
    name: 'search',
    alias: ['google', 'wiki', 'lyrics', 'lyric'],
    execute: async (sock, msg, args) => {
        const cmd = msg.message.conversation?.split(" ")[0].slice(1) || msg.message.extendedTextMessage?.text?.split(" ")[0].slice(1);
        const remoteJid = msg.key.remoteJid;
        const query = args.join(" ");

        if (!query) return sock.sendMessage(remoteJid, { text: `❌ Entha thappendath? Ex: .${cmd} Vijay` });

        await sock.sendMessage(remoteJid, { text: '🔍 Thappukayanu... (Searching)' });

        try {
            const fetch = (await import('node-fetch')).default;
            
            // 1. GOOGLE SEARCH
            if (cmd === 'google') {
                const res = await fetch(`https://api.siputzx.my.id/api/s/google?query=${encodeURIComponent(query)}`);
                const json = await res.json();
                if (!json.data) throw new Error("No Result");
                
                let text = `🔎 *GOOGLE SEARCH: ${query}*\n\n`;
                for (let i = 0; i < 3; i++) {
                    if (json.data[i]) {
                        text += `📌 *${json.data[i].title}*\n🔗 ${json.data[i].link}\n📝 ${json.data[i].snippet}\n\n`;
                    }
                }
                await sock.sendMessage(remoteJid, { text: text }, { quoted: msg });
            }

            // 2. WIKIPEDIA
            if (cmd === 'wiki') {
                const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                const json = await res.json();
                if (!json.title) throw new Error("No Result");

                let text = `📚 *WIKIPEDIA: ${json.title}*\n\n${json.extract}\n\n🔗 ${json.content_urls.desktop.page}`;
                if (json.originalimage?.source) {
                    await sock.sendMessage(remoteJid, { image: { url: json.originalimage.source }, caption: text }, { quoted: msg });
                } else {
                    await sock.sendMessage(remoteJid, { text: text }, { quoted: msg });
                }
            }

            // 3. LYRICS
            if (cmd === 'lyrics' || cmd === 'lyric') {
                const res = await fetch(`https://api.siputzx.my.id/api/s/lyrics?query=${encodeURIComponent(query)}`);
                const json = await res.json();
                if (!json.data) throw new Error("No Result");

                await sock.sendMessage(remoteJid, { 
                    text: `🎶 *LYRICS: ${json.data.title}*\n👤 Artist: ${json.data.artist}\n\n${json.data.lyrics}` 
                }, { quoted: msg });
            }

        } catch (e) {
            console.log(e);
            await sock.sendMessage(remoteJid, { text: '❌ Onnum kittiyilla (Nothing found).' });
        }
    }
};
