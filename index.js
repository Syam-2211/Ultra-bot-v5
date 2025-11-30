const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { connectDB, User } = require('./database');
const config = require('./config');

connectDB();

// Load Session from String (if deploying)
if (config.sessionID && config.sessionID.startsWith('ULTRA~')) {
    if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');
        const creds = Buffer.from(config.sessionID.replace('ULTRA~', ''), 'base64');
            fs.writeFileSync('./auth_info/creds.json', creds);
            }

            async function startBot() {
                const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
                    
                        // --- 🟢 PAIRING CODE CONFIGURATION 🟢 ---
                            const usePairingCode = true; // Set this to true
                                
                                    const sock = makeWASocket({
                                            logger: pino({ level: 'silent' }),
                                                    printQRInTerminal: !usePairingCode, // False if using pairing code
                                                            auth: state,
                                                                    // This specific browser setting is REQUIRED for pairing codes to work
                                                                            browser: ["Ubuntu", "Chrome", "20.0.04"], 
                                                                                    getMessage: async () => { return { conversation: 'hi' } }
                                                                                        });

                                                                                            // --- 🟢 REQUEST THE CODE 🟢 ---
                                                                                                // This runs only if you are not logged in yet
                                                                                                    if (usePairingCode && !sock.authState.creds.registered) {
                                                                                                            
                                                                                                                    // Wait 6 seconds for connection to initialize
                                                                                                                            setTimeout(async () => {
                                                                                                                                        // Clean the number from config (remove @s.whatsapp.net)
                                                                                                                                                    const myNumber = config.ownerNumber.replace(/[^0-9]/g, '');
                                                                                                                                                                
                                                                                                                                                                            console.log(`\n🤖 REQUESTING PAIRING CODE FOR: ${myNumber}...`);
                                                                                                                                                                                        try {
                                                                                                                                                                                                        const code = await sock.requestPairingCode(myNumber);
                                                                                                                                                                                                                        console.log(`\n\n⬇️⬇️ COPY THIS CODE ⬇️⬇️`);
                                                                                                                                                                                                                                        console.log(`\n   ${code}   \n`);
                                                                                                                                                                                                                                                        console.log(`⬆️⬆️ ENTER THIS ON WHATSAPP ⬆️⬆️\n\n`);
                                                                                                                                                                                                                                                                    } catch (err) {
                                                                                                                                                                                                                                                                                    console.log("❌ Failed to get pairing code. Check your internet or number.");
                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                        }, 6000);
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
                                                                                                                                                                                                                                                                                                                                                                                                        // ... (Keep your existing message logic here) ...
                                                                                                                                                                                                                                                                                                                                                                                                                // If you lost the previous message logic, let me know and I will paste it again.
                                                                                                                                                                                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                                                    startBot();
                                                                                                                                                                                                                                                                                                                                                                                                                    