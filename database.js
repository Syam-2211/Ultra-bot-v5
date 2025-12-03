const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// Initialize Supabase
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

const connectDB = async () => {
    // Test the connection
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
        console.log("❌ Supabase Error:", error.message);
    } else {
        console.log("✅ Connected to Supabase (PostgreSQL) Successfully!");
    }
};

// User Model Wrapper
const User = {
    findOne: async ({ id }) => {
        const { data } = await supabase.from('users').select('*').eq('id', id).single();
        if (!data) return null;
        return {
            ...data,
            save: async function() {
                await supabase.from('users').update({ 
                    wallet: this.wallet, warns: this.warns, role: this.role, isbanned: this.isbanned 
                }).eq('id', this.id);
            }
        };
    },
    create: async ({ id, name }) => {
        const newUser = { id, name, wallet: 0, warns: 0, role: 'user', isbanned: false };
        await supabase.from('users').insert([newUser]);
        return {
            ...newUser,
            save: async function() {
                await supabase.from('users').update({ 
                    wallet: this.wallet, warns: this.warns, role: this.role, isbanned: this.isbanned 
                }).eq('id', this.id);
            }
        };
    }
};

module.exports = { connectDB, User };