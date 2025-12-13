const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
});

const connectDB = async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log("✅ Connected to Neon PostgreSQL!");
    } catch (e) {
        console.log("❌ Neon Connection Failed:", e.message);
    }
};

const User = {
    findOne: async ({ id }) => {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length === 0) return null;
        return {
            ...res.rows[0],
            save: async function() {
                await pool.query(
                    'UPDATE users SET wallet=$1, warns=$2, role=$3, isbanned=$4 WHERE id=$5',
                    [this.wallet, this.warns, this.role, this.isbanned, this.id]
                );
            }
        };
    },
    create: async ({ id, name }) => {
        const newUser = { id, name, wallet: 0, warns: 0, role: 'user', isbanned: false };
        await pool.query(
            'INSERT INTO users (id, name, wallet, warns, role, isbanned) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, name, 0, 0, 'user', false]
        );
        return {
            ...newUser,
            save: async function() {
                await pool.query(
                    'UPDATE users SET wallet=$1, warns=$2, role=$3, isbanned=$4 WHERE id=$5',
                    [this.wallet, this.warns, this.role, this.isbanned, this.id]
                );
            }
        };
    }
};

module.exports = { connectDB, User, pool };
