const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http'); // Keeps Render alive
const { connectDB, User } = require('./database');
const config = require('./config');

// 1. Connect Database
connectDB();

// 2. Start Fake Web Server (To satisfy Render's port requirement)
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Bot Status: Online | Mode: ${config.workMode}`);
});
server.listen(process.env.PORT || 3000);

// 3. Load Session from String (if deploying)
if (config.sessionID && config.sessionID.startsWith('ULTRA~')) {
    if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');
    const creds = Buffer.from(config.sessionID.replace('ULTRA~', ''), 'base64');
    fs.writeFileSync('./auth_info/creds.json', creds);
}

// 4. Load Commands (Plugins)
const commands = new Map();
const cmdFolder = path.join(__dirname, 'commands');

// Check if commands folder exists
if (fs.existsSync(cmdFolder)) {
    fs.readdirSync(cmdFolder).forEach(file => {
        if (file.endsWith('.js')) {
            const cmd = require(path.join(cmdFolder, file));
            commands.set(cmd.name, cmd);
            if (cmd.alias) cmd.alias.forEach(a => commands.set(a, cmd));
            console.log(`🔌 Loaded Plugin: ${cmd.name}`);
        }
    });
} else {
    console.log("⚠️ Commands folder not found! Creating one...");
    fs.mkdirSync(cmdFolder);
}

// Global variable for Pairing Loop Protection
let hasRequestedCode = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    // 🔴 YOUR NUMBER (Clean version)
    const myNumber = config.ownerNumber.replace(/[^0-9]/g, '');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    // 🟢 SAFE PAIRING LOGIC 🟢
    if (!sock.authState.creds.registered && !hasRequestedCode) {
        hasRequestedCode = true; 
        console.log(`\n⏳ Waiting 20 seconds before requesting code (Anti-Ban Safety)...`);
        
        setTimeout(async () => {
            try {
                console.log(`\n🤖 REQUESTING PAIRING CODE FOR: ${myNumber}...`);
                const code = await sock.requestPairingCode(myNumber);
                console.log(`\n⬇️⬇️ COPY THIS CODE ⬇️⬇️`);
                console.log(`\n   ${code}   \n`);
                console.log(`⬆️⬆️ ENTER THIS ON WHATSAPP ⬆️⬆️\n`);
            } catch (err) {
                console.log("❌ Failed to get code. WhatsApp is still rate-limiting you. Wait more time.");
            }
        }, 20000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            // Only reconnect if we are ALREADY logged in. 
            // If we are just trying to pair, do not auto-restart to avoid loops.
            if (shouldReconnect && sock.authState.creds.registered) {
                console.log("⚠️ Connection dropped. Reconnecting...");
                startBot();
            } else {
                console.log("🛑 Bot stopped. If you are pairing, check logs above.");
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
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
        
        // 1. AUTO STATUS SAVER (Steal Status)
        if (msg.key.remoteJid === 'status@broadcast') {
            if (msg.message.imageMessage || msg.message.videoMessage) {
                const buffer = await downloadContentFromMessage(msg.message.imageMessage || msg.message.videoMessage, msg.message.imageMessage ? 'image' : 'video');
                await sock.sendMessage(config.ownerNumber, { 
                    [msg.message.imageMessage ? 'image' : 'video']: buffer, 
                    caption: `📱 Status from ${msg.pushName}` 
                });
            }
            return;
        }

        // 2. AD CARD AUTO-REPLY
        const botId = jidDecode(sock.user.id).user + '@s.whatsapp.net';
        const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        // Only reply if mode is PUBLIC or sender is OWNER
        const isOwner = sender === config.ownerNumber;
        if (config.workMode === 'private' && !isOwner) return;

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

        // 3. EXECUTE COMMANDS
        if (body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            const command = commands.get(cmdName);
            if (command) {
                // Get User from DB
                let user = await User.findOne({ id: sender });
                if (!user) user = await User.create({ id: sender, name: msg.pushName });

                const isSudo = user.role === 'sudo' || isOwner;

                try {
                    await command.execute(sock, msg, args, user, isSudo, isOwner);
                } catch (e) {
                    console.log(`Error in ${cmdName}:`, e);
                    await sock.sendMessage(sender, { text: '❌ Error executing command.' });
                }
            }
        }
    });
}
startBot();