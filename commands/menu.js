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

*🛡️ Admin (Boss Only)*
.kick @user - Purath aakkal
.add 919... - add aakkal
.promote @user - admin kodukkal
.demote @user - admin edukkal
.tagall [msg] - Ellarem vilikkan
.hidetag [msg] - Invisible tag

*🎨 Fun & Media*
.ai [doubt] - AI-yod samsarikkaam
.img [text] - Photo undakkam
.play [song] - Pattu download
.sticker - Photo sticker aakkan
.vv - ViewOnce photo edukkan (Reply)
`;

        // 2. The "Image Card" Message
        await sock.sendMessage(msg.key.remoteJid, { 
            text: text,
            contextInfo: { 
                externalAdReply: {
                    title: config.botName,       // Shows your Bot Name
                    body: "Tap here to follow!", // Subtitle
                    thumbnailUrl: "https://files.catbox.moe/mev5cq.jpeg", // 🖼️ CHANGE THIS to your logo link!
                    sourceUrl: "https://instagram.com/_mr.fro_ud_",         // 🔗 Link to your Insta
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
    }
};
