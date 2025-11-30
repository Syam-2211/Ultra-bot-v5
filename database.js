const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
    try {
            await mongoose.connect(config.mongoURL);
                    console.log("✅ MongoDB Connected");
                        } catch (err) {
                                console.log("❌ MongoDB Error (Check config.js)", err);
                                    }
                                    };

                                    const UserSchema = new mongoose.Schema({
                                        id: { type: String, unique: true },
                                            name: String,
                                                wallet: { type: Number, default: 0 },
                                                    role: { type: String, default: 'user' } // user, sudo, owner
                                                    });

                                                    const User = mongoose.model('User', UserSchema);
                                                    module.exports = { connectDB, User };
                                                    