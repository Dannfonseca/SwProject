import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing in .env');
    process.exit(1);
}

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'changeme';
const name = 'Admin';

async function seed() {
    const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });

    await pool.query(
        `INSERT INTO users (email, name, password_hash, role) 
     VALUES ($1, $2, $3, 'admin') 
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = 'admin'
     RETURNING id`,
        [email, name, hash]
    );

    console.log('✅ Admin user seeded successfully');
    await pool.end();
}

seed().catch(err => {
    console.error('Seed failed:', err.message);
    pool.end();
});
