const fs = require('fs');
const { Pool } = require('pg');
const envText = fs.readFileSync('.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const conn = line ? line.replace('DATABASE_URL=', '').trim() : '';
const needsSsl = /supabase\.com/i.test(conn || '');
const pool = new Pool({ connectionString: conn, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
const sql = "SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'defenses' AND column_name = 'monsters'";
pool.query(sql).then(r => { console.log(r.rows); }).catch(err => console.error(err.message)).finally(()=>pool.end());
