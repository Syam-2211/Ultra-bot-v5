module.exports = {
    name: 'ping',
    alias: ['alive', 'test'],
    execute: async (sock, msg, args) => {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! 🏓 I am here!' }, { quoted: msg });
    }
};
