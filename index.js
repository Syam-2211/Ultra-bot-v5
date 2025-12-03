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
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    // Clean phone number
    const myNumber = config.ownerNumber.replace(/[^0-9]/g, '');

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // PAIRING MODE
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        generateHighQualityLinkPreview: true,
        // Tweak: Increase timeout
        connectTimeoutMs: 60000, 
    });

    // 🟢 PAIRING LOGIC (Robust)
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
            
            // Log the reason for debugging
            console.log('Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);

            // Reconnect immediately if we are logged in OR if it was a random network glitch
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`🚀 ${config.botName} IS ONLINE!`);
        }
    });

    // --- MESSAGES HANDLER ---
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

        // 2. COMMANDS
        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);
            if (command) {
                // Get User from Supabase
                let user = await User.findOne({ id: sender });
                if (!user) user = await User.create({ id: sender, name: msg.pushName });

                const isOwner = sender === config.ownerNumber;
                const isSudo = user?.role === 'sudo' || isOwner;

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
