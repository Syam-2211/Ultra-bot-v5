module.exports = {
    name: 'menu',
    alias: ['help', 'list', 'commands'],
    execute: async (sock, msg, args) => {
        const config = require('../config');
        
        // Manual List of what we are installing
        const text = `
🤖 *${config.botName} COMMANDS* 🤖

*⚡ General*
.menu - Show this list
.ping - Check speed
.mode [public/private] - Change bot mode

*🛡️ Admin*
.kick @user - Remove user
.add 919... - Add user
.promote @user - Make admin
.demote @user - Remove admin
.hidetag [text] - Tag everyone invisible

*🎨 Media & AI*
.sticker - Convert image/video to sticker
.ai [query] - Ask the AI
.img [query] - Generate image
.play [song] - Download song
        `;

        await sock.sendMessage(msg.key.remoteJid, { 
            text: text,
            contextInfo: { externalAdReply: { title: config.botName, body: "Type .menu for help", mediaType: 1, thumbnailUrl: "https://i.imgur.com/P5yUpuM.png" }}
        }, { quoted: msg });
    }
};
