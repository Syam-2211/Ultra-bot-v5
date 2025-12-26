const config = require('../config');

module.exports = {
    handle: async (sock, msg) => {
        const sender = msg.key.remoteJid;

        // 1. Get the Owner's ID (Fixed crash logic)
        const ownerJid = config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net'; 
        
        // 2. Check if the message tags/mentions the Owner
        const isTagged = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(ownerJid);

        if (isTagged) {
            // --- SONGS LIST ---
            const songs = [
                "https://cdn.ironman.my.id/q/yjryp.mp4",
                "https://cdn.ironman.my.id/q/ywecS.mp4", 
                "https://cdn.ironman.my.id/q/zRSwS.mp4"
            ];
            const randomSong = songs[Math.floor(Math.random() * songs.length)];

            // --- IMAGES LIST ---
            const images = [
                "https://files.catbox.moe/nbn8w8.jpeg",
                "https://files.catbox.moe/dphztt.jpeg"
            ];
            const randomImage = images[Math.floor(Math.random() * images.length)];

            // 3. Send the Audio with the "Card" style
            await sock.sendMessage(sender, { 
                audio: { url: randomSong }, 
                mimetype: 'audio/mp4', 
                ptt: true, // Sends as Voice Note (Green Mic)
                contextInfo: { 
                    externalAdReply: {
                        title: "👤 I AM HERE!",
                        body: "Don't spam, bro.",
                        thumbnailUrl: randomImage,
                        sourceUrl: "https://wa.me/+919947121619?text=Heyy+🌝🤍",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });
        }
    }
};
