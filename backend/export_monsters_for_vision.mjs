import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is missing.');
  process.exit(1);
}

const needsSsl = /supabase\.com/i.test(databaseUrl);
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined
});

const NAME_MAP = {
  "Ryu": "Douglas",
  "Vancliffe": "Vancliffe",
  "Bernadotte": "Bernadotte",
  "Karnal": "Karnal",
  "Borgnine": "Borgnine",
  "Sagar": "Sagar",
  "Craig": "Craig",
  "Gurkha": "Gurkha",
  "Berenice": "Berenice",
  "Lariel": "Lariel",
  "Cordelia": "Cordelia",
  "Leah": "Leah",
  "Veressa": "Veressa",
  "Todd": "Todd",
  "Kyle": "Kyle",
  "Jarrett": "Jarrett",
  "Hekerson": "Hekerson",
  "Cayde": "Cayde",
  "GingerBrave": "Thomas",
  "Pure Vanilla Cookie": "Lucia",
  "Hollyberry Cookie": "Alice",
  "Espresso Cookie": "Hibiscus",
  "Madeleine Cookie": "Pavé",
  "Altair": "Frederic",
  "Ezio": "Patric",
  "Bayek": "Ashour",
  "Kassandra": "Federica",
  "Eivor": "Solveig",
  "Geralt": "Magnus",
  "Ciri": "Reyka",
  "Triss": "Enshia",
  "Yennefer": "Tarnisha",
  "Jin Kazama": "Kai",
  "Hwoarang": "Taebaek",
  "Paul Phoenix": "Duke",
  "Nina Williams": "Shasha",
  "Heihachi Mishima": "Daimon",
  "Yuji Itadori": "Rick",
  "Satoru Gojo": "Werner",
  "Megumi Fushiguro": "Tetsuya",
  "Romen Sukuna": "Haato",
  "Nobara Kugisaki": "Aya",
  "Tanjiro Kamado": "Azure Dragon Swordsman",
  "Inosuke Hashibira": "White Tiger Blade Master",
  "Nezuko Kamado": "Vermilion Bird Dancer",
  "Zenitsu Agatsuma": "Qilin Slasher",
  "Gyomei Himejima": "Black Tortoise Champion",
  "Gandalf": "Gandalf",
  "Aragorn": "Aragorn",
  "Legolas": "Legolas",
  "Frodo": "Frodo",
  "Gollum": "Gollum"
};

const normalizeKey = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9\s\-_.]/g, '')
  .trim();

const NAME_MAP_KEYS = Object.entries(NAME_MAP).reduce((acc, [key, value]) => {
  acc[normalizeKey(key)] = value;
  return acc;
}, {});

const normalizeName = (name) => {
  const direct = NAME_MAP[name];
  if (direct) return direct;
  const key = normalizeKey(name);
  return NAME_MAP_KEYS[key] || name;
};

const run = async () => {
  const res = await pool.query(
    `SELECT com2us_id, name, element, image_filename
     FROM monsters
     WHERE image_filename IS NOT NULL
       AND name IS NOT NULL
       AND obtainable = true
       AND natural_stars IN (2,3,4,5)
       AND awaken_level >= 1`
  );

  const rows = res.rows.map((r) => ({
    com2us_id: r.com2us_id,
    name: normalizeName(r.name),
    image_filename: r.image_filename,
    element: r.element
  }));

  const outPath = path.resolve(process.cwd(), 'vision_service', 'data', 'monsters.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(rows, null, 2), 'utf8');

  console.log(`Saved ${rows.length} monsters to ${outPath}`);
  await pool.end();
};

run().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
