const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
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
    res.end(`Bot Status: Online`);
});
server.listen(process.env.PORT || 3000);

// 3. Load Session
if (config.sessionID && config.sessionID.startsWith('ULTRA~')) {
    if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');
    const creds = Buffer.from(config.sessionID.replace('ULTRA~', ''), 'base64');
    fs.writeFileSync('./auth_info/creds.json', creds);
}

// 4. Load Commands
const commands = new Map();
const cmdFolder = path.join(__dirname, 'commands');
if (!fs.existsSync(cmdFolder)) fs.mkdirSync(cmdFolder);
fs.readdirSync(cmdFolder).forEach(file => {
    if (file.endsWith('.js')) {
        const cmd = require(path.join(cmdFolder, file));
        commands.set(cmd.name, cmd);
        if (cmd.alias) cmd.alias.forEach(a => commands.set(a, cmd));
        console.log(`🔌 Loaded Plugin: ${cmd.name}`);
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    const myNumber = config.ownerNumber.replace(/[^0-9]/g, '');

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000, 
    });

    // 🟢 PAIRING LOGIC (RESTORED!)
    if (!sock.authState.creds.registered) {
        console.log(`\n⏳ Waiting 15 seconds to stabilize connection...`);
        setTimeout(async () => {
            try {
                console.log(`\n🤖 REQUESTING PAIRING CODE FOR: ${myNumber}...`);
                const code = await sock.requestPairingCode(myNumber);
                console.log(`\n⬇️⬇️ COPY THIS CODE ⬇️⬇️`);
                console.log(`\n   ${code}   \n`);
                console.log(`⬆️⬆️ ENTER THIS ON WHATSAPP ⬆️⬆️\n`);
            } catch (err) {
                console.log("❌ Failed to get code. WhatsApp might be busy.");
            }
        }, 15000);
    }

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

        // ⚠️ "FROM ME" CHECK REMOVED (So it replies to you!)
        
        const sender = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);

            if (command) {
                let user;
                try {
                     user = await User.findOne({ id: sender });
                     if (!user) user = await User.create({ id: sender, name: msg.pushName || 'User' });
                } catch (e) {
                     user = { role: 'owner' };
                }

                const isOwner = sender === config.ownerNumber || msg.key.fromMe;
                try {
                    await command.execute(sock, msg, args, user, true, isOwner);
                } catch (e) {
                    console.log(e);
                }
            }
        }
    });
}
startBot();
