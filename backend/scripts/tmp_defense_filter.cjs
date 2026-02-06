const fs = require('fs');
const { Pool } = require('pg');
const envText = fs.readFileSync('.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const conn = line ? line.replace('DATABASE_URL=', '').trim() : '';
const needsSsl = /supabase\.com/i.test(conn || '');
const pool = new Pool({ connectionString: conn, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
const sql = "SELECT COUNT(*) AS count FROM defenses WHERE EXISTS (SELECT 1 FROM unnest(monsters) AS m WHERE m ILIKE $1)";
pool.query(sql, ['%Chandra%']).then(r => { console.log(r.rows[0]); }).catch(err => console.error(err.message)).finally(()=>pool.end());
