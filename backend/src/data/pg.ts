import { Pool } from 'pg';

let pool: Pool | null = null;

const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }
    const needsSsl = /supabase\.com/i.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
};

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const mapDefenseRow = (row: any) => ({
  _id: row.id?.toString?.() ?? String(row.id),
  team_hash: row.team_hash ?? null,
  monsters: row.monsters ?? [],
  leader_index: row.leader_index ?? 0,
  win_rate: toNumber(row.win_rate, 0),
  pick_rate: toNumber(row.pick_rate, 0),
  tier: row.tier ?? 'User',
  battle_type: row.battle_type ?? 'SIEGE',
  source: row.source ?? 'user',
  note: row.note ?? null,
  submitted_by: row.submitted_by ?? null,
  submitted_by_name: row.submitted_by_name ?? null,
  updated_at: row.updated_at ?? null
});

const mapUserRow = (row: any) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  password_hash: row.password_hash ?? null,
  google_id: row.google_id ?? null,
  avatar_url: row.avatar_url ?? null,
  role: row.role ?? 'user',
  created_at: row.created_at,
  updated_at: row.updated_at
});

const mapSkillRow = (row: any) => ({
  _id: row.id?.toString?.() ?? String(row.id),
  com2us_id: row.com2us_id,
  id: row.swarfarm_id,
  name: row.name,
  description: row.description,
  icon_filename: row.icon_filename,
  cooldown: row.cooldown,
  name_pt: row.name_pt,
  description_pt: row.description_pt
});

const parseJson = (value: any) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const mapMonsterRow = (row: any) => ({
  _id: row.id?.toString?.() ?? String(row.id),
  com2us_id: row.com2us_id,
  family_id: row.family_id,
  name: row.name,
  image_filename: row.image_filename,
  element: row.element,
  natural_stars: row.natural_stars,
  type: row.type,
  skills: row.skill_ids ?? [],
  leader_skill: parseJson(row.leader_skill),
  base_hp: row.base_hp,
  base_attack: row.base_attack,
  base_defense: row.base_defense,
  base_speed: row.base_speed,
  max_lvl_hp: row.max_lvl_hp,
  max_lvl_attack: row.max_lvl_attack,
  max_lvl_defense: row.max_lvl_defense,
  speed: row.base_speed,
  awaken_level: row.awaken_level,
  awakens_from: row.awakens_from,
  awakens_to: row.awakens_to,
  obtainable: row.obtainable
});

const buildInsert = (table: string, columns: string[], rows: any[][], conflictTarget: string, updateColumns: string[]) => {
  const values: any[] = [];
  const placeholders = rows.map((row, rowIndex) => {
    const offset = rowIndex * columns.length;
    row.forEach((value) => values.push(value));
    const rowPlaceholders = columns.map((_, colIndex) => `$${offset + colIndex + 1}`).join(', ');
    return `(${rowPlaceholders})`;
  });

  const updates = updateColumns.map((col) => `${col} = EXCLUDED.${col}`).join(', ');
  const text = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')} ` +
    `ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates};`;

  return { text, values };
};

const chunk = <T>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const insertDefensesBatch = async (defs: any[]) => {
  if (!defs.length) return 0;
  const pool = getPool();

  const columns = [
    'team_hash',
    'monsters',
    'leader_index',
    'win_rate',
    'pick_rate',
    'tier',
    'battle_type',
    'source',
    'note',
    'updated_at',
    'submitted_by',
    'submitted_by_name'
  ];

  const rows = defs.map((d) => {
    const monsters = Array.isArray(d.monsters) ? d.monsters : [];
    const teamHash = d.team_hash || monsters.slice().sort().join('_');
    return [
      teamHash,
      monsters,
      d.leader_index ?? 0,
      d.win_rate ?? 0,
      d.pick_rate ?? 0,
      d.tier ?? 'User',
      d.battle_type ?? 'SIEGE',
      d.source ?? 'user',
      d.note ?? null,
      d.updated_at ?? new Date(),
      d.submitted_by ?? null,
      d.submitted_by_name ?? null
    ];
  });

  const updateColumns = ['leader_index', 'win_rate', 'pick_rate', 'tier', 'battle_type', 'source', 'note', 'updated_at', 'monsters'];
  const { text, values } = buildInsert('defenses', columns, rows, 'team_hash', updateColumns);
  const res = await pool.query(text, values);
  return res.rowCount || 0;
};

export const initPg = async () => {
  getPool();
};

export const data = {
  getDefenses: async (page: number, limit: number, monster?: string, monsterList?: string[]) => {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const filters: string[] = [];
    const params: any[] = [];
    if (monsterList && monsterList.length > 0) {
      params.push(monsterList);
      filters.push(`EXISTS (SELECT 1 FROM unnest(monsters) AS m WHERE m = ANY($${params.length}))`);
    } else if (monster && monster.trim().length > 0) {
      params.push(`%${monster.trim()}%`);
      filters.push(`EXISTS (SELECT 1 FROM unnest(monsters) AS m WHERE m ILIKE $${params.length})`);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [itemsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM defenses ${whereSql} ORDER BY updated_at DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) AS count FROM defenses ${whereSql}`, params)
    ]);

    const total = toNumber(countRes.rows[0]?.count ?? 0, 0);
    return {
      items: itemsRes.rows.map(mapDefenseRow),
      total
    };
  },

  createDefense: async (input: any) => {
    const pool = getPool();
    const monsters = Array.isArray(input.monsters) ? input.monsters : [];
    const teamHash = input.team_hash || monsters.slice().sort().join('_');

    const res = await pool.query(
      `INSERT INTO defenses (team_hash, monsters, leader_index, win_rate, pick_rate, tier, battle_type, source, note, updated_at, submitted_by, submitted_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        teamHash,
        monsters,
        input.leader_index ?? 0,
        input.win_rate ?? 0,
        input.pick_rate ?? 0,
        input.tier ?? 'User',
        input.battle_type ?? 'SIEGE',
        input.source ?? 'user',
        input.note ?? null,
        new Date(),
        input.submitted_by ?? null,
        input.submitted_by_name ?? null
      ]
    );

    return mapDefenseRow(res.rows[0]);
  },

  bulkInsertDefenses: async (defenses: any[]) => {
    if (!defenses.length) return 0;
    let inserted = 0;
    const batches = chunk(defenses, 400);
    for (const batch of batches) {
      inserted += await insertDefensesBatch(batch);
    }
    return inserted;
  },

  deleteAllDefenses: async () => {
    const pool = getPool();
    await pool.query('DELETE FROM defenses');
  },

  getDefenseById: async (id: string) => {
    const pool = getPool();
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const res = await pool.query('SELECT * FROM defenses WHERE id = $1 LIMIT 1', [numericId]);
    if (!res.rows[0]) return null;
    return mapDefenseRow(res.rows[0]);
  },

  deleteDefenseById: async (id: string) => {
    const pool = getPool();
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const res = await pool.query('DELETE FROM defenses WHERE id = $1 RETURNING *', [numericId]);
    if (!res.rows[0]) return null;
    return mapDefenseRow(res.rows[0]);
  },

  updateDefense: async (id: string, update: any) => {
    const pool = getPool();
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;

    const monsters = Array.isArray(update.monsters) ? update.monsters : [];
    const res = await pool.query(
      `UPDATE defenses
       SET monsters = $1, note = $2, leader_index = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [monsters, update.note ?? null, update.leader_index ?? 0, new Date(), numericId]
    );

    if (!res.rows[0]) return null;
    return mapDefenseRow(res.rows[0]);
  },

  getMonstersGrouped: async (page: number, limit: number, letter?: string, search?: string) => {
    const pool = getPool();
    const filters: string[] = [
      'obtainable = true',
      'natural_stars IN (2,3,4,5)',
      'awaken_level >= 1'
    ];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      filters.push(`name ILIKE $${params.length}`);
    } else if (letter) {
      params.push(`${letter}%`);
      filters.push(`name ILIKE $${params.length}`);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const pageNum = Number(page || 1);
    const limitNum = Number(limit || 10);
    const offset = (pageNum - 1) * limitNum;

    params.push(offset, limitNum);

    const sql = `
      WITH filtered AS (
        SELECT * FROM monsters ${whereSql}
      ),
      ordered AS (
        SELECT *, MIN(name) OVER (PARTITION BY family_id) AS first_monster_name
        FROM filtered
      ),
      families AS (
        SELECT DISTINCT family_id, first_monster_name
        FROM ordered
        ORDER BY first_monster_name
        OFFSET $${params.length - 1} LIMIT $${params.length}
      )
      SELECT o.*
      FROM ordered o
      JOIN families f ON o.family_id = f.family_id
      ORDER BY f.first_monster_name, o.natural_stars DESC, o.element ASC;
    `;

    const res = await pool.query(sql, params);
    const rows = res.rows;

    const skillIds = new Set<number>();
    for (const row of rows) {
      const ids: number[] = Array.isArray(row.skill_ids) ? row.skill_ids : [];
      ids.forEach((id) => skillIds.add(id));
    }

    let skillMap = new Map<number, any>();
    if (skillIds.size > 0) {
      const skillsRes = await pool.query('SELECT * FROM skills WHERE swarfarm_id = ANY($1)', [Array.from(skillIds)]);
      skillMap = new Map(skillsRes.rows.map((r: any) => [r.swarfarm_id, mapSkillRow(r)]));
    }

    const grouped = new Map<number, any>();
    for (const row of rows) {
      const monster = mapMonsterRow(row);
      monster.skills_data = (monster.skills as number[])
        .map((id: number) => skillMap.get(id))
        .filter(Boolean);

      const familyId = row.family_id as number;
      if (!grouped.has(familyId)) {
        grouped.set(familyId, {
          _id: familyId,
          monsters: [],
          firstMonsterName: row.first_monster_name ?? monster.name
        });
      }
      grouped.get(familyId).monsters.push(monster);
    }

    return Array.from(grouped.values());
  },

  getMonsterByCom2usId: async (com2usId: number) => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM monsters WHERE com2us_id = $1 LIMIT 1', [com2usId]);
    if (!res.rows[0]) return null;

    const monster = mapMonsterRow(res.rows[0]);
    const skillIds = Array.isArray(monster.skills) ? monster.skills : [];

    if (skillIds.length > 0) {
      const skillsRes = await pool.query('SELECT * FROM skills WHERE swarfarm_id = ANY($1)', [skillIds]);
      monster.skills_data = skillsRes.rows.map(mapSkillRow);
    } else {
      monster.skills_data = [];
    }

    return monster;
  },

  getMonsterNames: async () => {
    const pool = getPool();
    const res = await pool.query(
      `SELECT name FROM monsters
       WHERE name IS NOT NULL
         AND obtainable = true
         AND natural_stars IN (2,3,4,5)
         AND awaken_level >= 1`
    );
    return res.rows.map((r: any) => r.name).filter(Boolean);
  },

  getDefenseMonsterNames: async () => {
    const pool = getPool();
    const res = await pool.query('SELECT DISTINCT unnest(monsters) AS name FROM defenses');
    return res.rows.map((r: any) => r.name).filter(Boolean);
  },

  getAmbiguousMonsterElements: async () => {
    const pool = getPool();
    const res = await pool.query(
      `SELECT name, array_agg(DISTINCT element) AS elements
       FROM monsters
       WHERE name IS NOT NULL
         AND element IS NOT NULL
         AND obtainable = true
         AND natural_stars IN (2,3,4,5)
         AND awaken_level >= 1
       GROUP BY name
       HAVING COUNT(DISTINCT element) > 1`
    );

    const map = new Map<string, string[]>();
    res.rows.forEach((row: any) => {
      map.set(row.name, row.elements || []);
    });
    return map;
  },

  getMonstersByNames: async (names: string[]) => {
    if (!names.length) return [];
    const pool = getPool();
    const res = await pool.query(
      'SELECT name, image_filename, element FROM monsters WHERE name = ANY($1)',
      [names]
    );
    return res.rows.map((r: any) => ({
      name: r.name,
      image_filename: r.image_filename,
      element: r.element
    }));
  },

  findDefensesByMonsters: async (detectedMonsters: string[]) => {
    const pool = getPool();
    const res = await pool.query(
      'SELECT * FROM defenses WHERE monsters <@ $1::text[] ORDER BY win_rate DESC, updated_at DESC LIMIT 100',
      [detectedMonsters]
    );
    return res.rows.map(mapDefenseRow);
  },

  getDefensesByMonsterName: async (name: string, limit = 100) => {
    const pool = getPool();
    const res = await pool.query(
      'SELECT * FROM defenses WHERE monsters @> $1::text[] ORDER BY win_rate DESC, updated_at DESC LIMIT $2',
      [[name], limit]
    );
    return res.rows.map(mapDefenseRow);
  },

  getSkillsToTranslate: async (limit = 20) => {
    const pool = getPool();
    const res = await pool.query(
      'SELECT id, name, description FROM skills WHERE name_pt IS NULL OR description_pt IS NULL LIMIT $1',
      [limit]
    );

    return res.rows.map((row: any) => ({
      id: row.id?.toString?.() ?? String(row.id),
      name: row.name,
      description: row.description
    }));
  },

  updateSkillTranslation: async (id: string, data: { name_pt: string; description_pt: string }) => {
    const pool = getPool();
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    await pool.query(
      'UPDATE skills SET name_pt = $1, description_pt = $2 WHERE id = $3',
      [data.name_pt, data.description_pt, numericId]
    );
  },

  countUntranslatedSkills: async () => {
    const pool = getPool();
    const res = await pool.query('SELECT COUNT(*) AS count FROM skills WHERE name_pt IS NULL OR description_pt IS NULL');
    return toNumber(res.rows[0]?.count ?? 0, 0);
  },

  upsertSkill: async (item: any) => {
    const pool = getPool();
    const columns = [
      'com2us_id',
      'swarfarm_id',
      'name',
      'description',
      'icon_filename',
      'cooldown',
      'name_pt',
      'description_pt'
    ];

    const rows = [[
      item.com2us_id ?? null,
      item.id ?? null,
      item.name ?? null,
      item.description ?? null,
      item.icon_filename ?? null,
      item.cooldown ?? null,
      item.name_pt ?? null,
      item.description_pt ?? null
    ]];

    const updateColumns = columns.filter((c) => c !== 'swarfarm_id');
    const { text, values } = buildInsert('skills', columns, rows, 'swarfarm_id', updateColumns);
    await pool.query(text, values);
  },

  upsertMonster: async (item: any) => {
    const pool = getPool();
    const columns = [
      'com2us_id',
      'family_id',
      'name',
      'image_filename',
      'element',
      'natural_stars',
      'type',
      'skill_ids',
      'leader_skill',
      'base_hp',
      'base_attack',
      'base_defense',
      'base_speed',
      'max_lvl_hp',
      'max_lvl_attack',
      'max_lvl_defense',
      'awakens_from',
      'awakens_to',
      'awaken_level',
      'obtainable'
    ];

    const rows = [[
      item.com2us_id ?? null,
      item.family_id ?? null,
      item.name ?? null,
      item.image_filename ?? null,
      item.element ?? null,
      item.natural_stars ?? null,
      item.type ?? null,
      Array.isArray(item.skills) ? item.skills : [],
      item.leader_skill ?? null,
      item.base_hp ?? null,
      item.base_attack ?? null,
      item.base_defense ?? null,
      item.base_speed ?? null,
      item.max_lvl_hp ?? null,
      item.max_lvl_attack ?? null,
      item.max_lvl_defense ?? null,
      item.awakens_from ?? null,
      item.awakens_to ?? null,
      item.awaken_level ?? null,
      item.obtainable ?? null
    ]];

    const updateColumns = columns.filter((c) => c !== 'com2us_id');
    const { text, values } = buildInsert('monsters', columns, rows, 'com2us_id', updateColumns);
    await pool.query(text, values);
  },

  upsertDefense: async (item: any) => {
    const pool = getPool();
    const monsters = Array.isArray(item.monsters) ? item.monsters : [];
    const teamHash = item.team_hash || monsters.slice().sort().join('_');

    const columns = [
      'team_hash',
      'monsters',
      'win_rate',
      'pick_rate',
      'tier',
      'battle_type'
    ];

    const rows = [[
      teamHash,
      monsters,
      item.win_rate ?? 0,
      item.pick_rate ?? 0,
      item.tier ?? 'N/A',
      item.battle_type ?? 'WORLDGUILDBATTLE'
    ]];

    const updateColumns = columns.filter((c) => c !== 'team_hash');
    const { text, values } = buildInsert('defenses', columns, rows, 'team_hash', updateColumns);
    await pool.query(text, values);
  },

  // ===== USER CRUD =====

  createUser: async (input: any) => {
    const pool = getPool();
    const res = await pool.query(
      `INSERT INTO users (email, name, password_hash, google_id, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.email,
        input.name,
        input.password_hash ?? null,
        input.google_id ?? null,
        input.avatar_url ?? null,
        input.role ?? 'user'
      ]
    );
    return mapUserRow(res.rows[0]);
  },

  getUserByEmail: async (email: string) => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (!res.rows[0]) return null;
    return mapUserRow(res.rows[0]);
  },

  getUserByGoogleId: async (googleId: string) => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE google_id = $1 LIMIT 1', [googleId]);
    if (!res.rows[0]) return null;
    return mapUserRow(res.rows[0]);
  },

  getUserById: async (id: number) => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (!res.rows[0]) return null;
    return mapUserRow(res.rows[0]);
  },

  listUsers: async () => {
    const pool = getPool();
    const res = await pool.query('SELECT id, email, name, avatar_url, role, created_at FROM users ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      avatar_url: r.avatar_url,
      role: r.role,
      created_at: r.created_at
    }));
  },

  updateUser: async (id: number, updates: any) => {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = $${idx}`);
    values.push(new Date());
    idx++;

    values.push(id);
    const res = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!res.rows[0]) return null;
    return mapUserRow(res.rows[0]);
  }
};
