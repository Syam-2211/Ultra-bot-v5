const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { connectDB, User } = require('./database');
const config = require('./config');

// 1. Connect Database
connectDB();

// 2. Web Server
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Bot Status: Online | Mode: ${config.workMode}`);
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

    // --- MESSAGES HANDLER ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        // 🟢 DEBUG LOG: PROOF THE BOT HEARS YOU
        console.log("📩 Message Received:", JSON.stringify(msg.message.conversation || msg.message.extendedTextMessage?.text));

        // ⚠️ CRITICAL FIX: We REMOVED the "fromMe" check!
        // Now the bot will listen to YOU.
        
        const sender = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 1. SIMPLE PING TEST (Does not use Database)
        if (body === '.ping') {
            console.log("✅ Ping Detected! Replying...");
            await sock.sendMessage(sender, { text: 'Pong! 🏓' }, { quoted: msg });
            return;
        }

        // 2. COMMANDS
        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);

            if (command) {
                console.log(`⚙️ Executing command: ${cmdName}`);
                
                // Get User from Supabase (Wrapped in try/catch to prevent crashes)
                let user;
                try {
                    user = await User.findOne({ id: sender });
                    if (!user) user = await User.create({ id: sender, name: msg.pushName });
                } catch (err) {
                    console.log("⚠️ Database Error (Ignoring):", err.message);
                    // Create fake user so command still runs
                    user = { id: sender, name: 'User', wallet: 0, role: 'user', save: () => {} };
                }

                const isOwner = sender === config.ownerNumber || msg.key.fromMe;
                const isSudo = user?.role === 'sudo' || isOwner;

                try {
                    await command.execute(sock, msg, args, user, isSudo, isOwner);
                } catch (e) {
                    console.log(`❌ Command Error:`, e);
                    await sock.sendMessage(sender, { text: '❌ Error executing command.' });
                }
            }
        }
    });
}
startBot();
