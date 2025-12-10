const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { connectDB, User } = require('./database');
const config = require('./config');

connectDB();

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Bot Status: Online`);
});
server.listen(process.env.PORT || 3000);

if (config.sessionID && config.sessionID.startsWith('ULTRA~')) {
    if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');
    const creds = Buffer.from(config.sessionID.replace('ULTRA~', ''), 'base64');
    fs.writeFileSync('./auth_info/creds.json', creds);
}

const commands = new Map();
const cmdFolder = path.join(__dirname, 'commands');
if (!fs.existsSync(cmdFolder)) fs.mkdirSync(cmdFolder);
fs.readdirSync(cmdFolder).forEach(file => {
    if (file.endsWith('.js')) {
        const cmd = require(path.join(cmdFolder, file));
        commands.set(cmd.name, cmd);
        if (cmd.alias) cmd.alias.forEach(a => commands.set(a, cmd));
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000, 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`🚀 ${config.botName} IS ONLINE!`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        // ⚠️ I REMOVED THE "fromMe" CHECK HERE ⚠️
        // Now it will reply to you!

        const sender = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        console.log(`📩 New Message: ${body} from ${sender}`); // Debug Log

        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);

            if (command) {
                // Mock user for speed
                const user = { id: sender, name: msg.pushName || 'User', role: 'owner' };
                try {
                    await command.execute(sock, msg, args, user, true, true);
                } catch (e) {
                    console.log(e);
                }
            }
        }
    });
}
startBot();
