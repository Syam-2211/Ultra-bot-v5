module.exports = {
    name: 'menu',
    alias: ['help', 'list'],
    execute: async (sock, msg, args) => {
        const config = require('../config');
        
        // 1. The Menu Text (Manglish)
        const text = `
🤖 *${config.botName} COMMANDS* 🤖
(Aliya, ithoke aanu nammude powers)

*⚡ General*
.ping - Speed check
.menu - Ee list kaanam

*📥 Downloads (No Watermark)*
.insta [link] - Instagram Reels/Post
.tiktok [link] - TikTok Video
.fb [link] - Facebook Video
.play [song] - Pattu download

*🔍 Search Tools*
.google [query] - Google Search
.wiki [query] - Wikipedia
.lyrics [song] - Pattu varikal

*🎨 Fun & Media*
.ai [doubt] - AI-yod samsarikkaam
.img [text] - Photo undakkam
.sticker - Photo sticker aakkan
.tts [text] - Parayippikkal (Text-to-Speech)

*🛡️ Admin (Boss Only)*
.kick @user - Purath aakkal
.add 919... - Agath aakkal
.promote @user - Power kodukkal
.demote @user - Power edukkal
.tagall [msg] - Ellarem vilikkan
.hidetag [msg] - Invisible tag
.vv - ViewOnce photo edukkan (Reply)
`;

        // 2. The "Image Card" Message
        await sock.sendMessage(msg.key.remoteJid, { 
            text: text,
            contextInfo: { 
                externalAdReply: {
                    title: config.botName,       
                    body: "Tap here to follow!", 
                    thumbnailUrl: "https://i.imgur.com/P5yUpuM.png", // 🖼️ Your Logo
                    sourceUrl: "https://instagram.com/syam",         
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
    }
};
