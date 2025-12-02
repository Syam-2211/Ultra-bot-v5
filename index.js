const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { connectDB, User } = require('./database');
const config = require('./config');

// 1. Connect Database
connectDB();

// 2. Web Server (Keeps Render Alive)
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running in QR Mode');
});
server.listen(process.env.PORT || 3000);

// 3. Load Session (Only if you have a string, otherwise we generate new)
if (config.sessionID && config.sessionID.startsWith('ULTRA~')) {
    if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');
    const creds = Buffer.from(config.sessionID.replace('ULTRA~', ''), 'base64');
    fs.writeFileSync('./auth_info/creds.json', creds);
}

// 4. Load Commands
const commands = new Map();
const cmdFolder = path.join(__dirname, 'commands');
if (fs.existsSync(cmdFolder)) {
    fs.readdirSync(cmdFolder).forEach(file => {
        if (file.endsWith('.js')) {
            const cmd = require(path.join(cmdFolder, file));
            commands.set(cmd.name, cmd);
            if (cmd.alias) cmd.alias.forEach(a => commands.set(a, cmd));
        }
    });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    // 🟢 QR CODE MODE CONFIGURATION 🟢
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // ✅ TRUE = Print QR Code
        auth: state,
        // We remove the specific browser config so it looks like a normal Web Login
        browser: [config.botName, "Chrome", "1.0"],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("🟢 QR CODE GENERATED. PLEASE SCAN!");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log("⚠️ Connection closed. Reconnecting...");
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`🚀 ${config.botName} IS ONLINE!`);
        }
    });

    // --- MESSAGES HANDLER (Keep your existing logic) ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 1. AUTO STATUS SAVER
        if (msg.key.remoteJid === 'status@broadcast') {
            if (msg.message.imageMessage || msg.message.videoMessage) {
                const buffer = await downloadContentFromMessage(msg.message.imageMessage || msg.message.videoMessage, msg.message.imageMessage ? 'image' : 'video');
                await sock.sendMessage(config.ownerNumber, { [msg.message.imageMessage ? 'image' : 'video']: buffer, caption: `📱 Status from ${msg.pushName}` });
            }
            return;
        }

        // 2. AD CARD
        const botId = jidDecode(sock.user.id).user + '@s.whatsapp.net';
        const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentions.includes(botId)) {
             await sock.sendMessage(sender, {
                text: `Hello @${sender.split('@')[0]}!`,
                mentions: [sender],
                contextInfo: {
                    externalAdReply: {
                        title: config.adName,
                        body: config.adSlogan,
                        thumbnailUrl: "https://i.imgur.com/P5yUpuM.png",
                        sourceUrl: config.adLink,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });
        }

        // 3. COMMANDS
        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);
            if (command) {
                let user = await User.findOne({ id: sender });
                if (!user) user = await User.create({ id: sender, name: msg.pushName });
                
                const isOwner = sender === config.ownerNumber;
                const isSudo = user.role === 'sudo' || isOwner;

                try {
                    await command.execute(sock, msg, args, user, isSudo, isOwner);
                } catch (e) {
                    console.log(e);
                }
            }
        }
    });
}
startBot();
