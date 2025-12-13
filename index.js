const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { connectDB, User, pool } = require('./database'); // Using 'pool' for Neon
const config = require('./config');

// 1. Connect Database & Start Server
connectDB();
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Bot Status: Online (Neon DB)`);
});
server.listen(process.env.PORT || 3000);

// 2. Load Commands
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
    // 🟢 AUTH RESTORE (FROM NEON) 🟢
    try {
        // We check if a session exists in the 'auth' table
        const res = await pool.query('SELECT session_data FROM auth WHERE id = $1', ['creds']);
        if (res.rows.length > 0) {
            if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');
            fs.writeFileSync('./auth_info/creds.json', res.rows[0].session_data);
            console.log("✅ Session Restored from Neon Database!");
        }
    } catch (e) {
        console.log("ℹ️ No saved session found. Starting fresh.");
    }

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

    // 🟢 AUTH SAVE (TO NEON) 🟢
    sock.ev.on('creds.update', async () => {
        await saveCreds();
        try {
            if (fs.existsSync('./auth_info/creds.json')) {
                const content = fs.readFileSync('./auth_info/creds.json', 'utf-8');
                // This saves the file to Neon. If it exists, it updates it.
                await pool.query(
                    'INSERT INTO auth (id, session_data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET session_data = $2',
                    ['creds', content]
                );
            }
        } catch (e) {
            console.log("⚠️ Failed to save session to Neon:", e.message);
        }
    });

    // 🟢 PAIRING LOGIC
    if (!sock.authState.creds.registered) {
        console.log(`\n⏳ Waiting 10 seconds for connection...`);
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
        }, 10000);
    }

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
        
        const sender = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);

            if (command) {
                // Fetch user from Neon
                let user = { role: 'user' };
                try {
                     const u = await User.findOne({ id: sender });
                     if (u) user = u;
                } catch (e) {}
                
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
