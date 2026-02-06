-- Core schema for Supabase/Postgres migration

CREATE TABLE IF NOT EXISTS skills (
  id BIGSERIAL PRIMARY KEY,
  swarfarm_id INTEGER NOT NULL UNIQUE,
  com2us_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_filename TEXT,
  cooldown INTEGER,
  name_pt TEXT,
  description_pt TEXT,
  mongo_id TEXT
);

CREATE TABLE IF NOT EXISTS monsters (
  id BIGSERIAL PRIMARY KEY,
  com2us_id INTEGER NOT NULL UNIQUE,
  family_id INTEGER,
  name TEXT NOT NULL,
  image_filename TEXT,
  element TEXT,
  natural_stars INTEGER,
  type TEXT,
  skill_ids INTEGER[] NOT NULL DEFAULT '{}',
  leader_skill JSONB,
  base_hp INTEGER,
  base_attack INTEGER,
  base_defense INTEGER,
  base_speed INTEGER,
  max_lvl_hp INTEGER,
  max_lvl_attack INTEGER,
  max_lvl_defense INTEGER,
  awakens_from INTEGER,
  awakens_to INTEGER,
  awaken_level INTEGER,
  obtainable BOOLEAN,
  mongo_id TEXT
);

CREATE TABLE IF NOT EXISTS defenses (
  id BIGSERIAL PRIMARY KEY,
  team_hash TEXT UNIQUE,
  monsters TEXT[] NOT NULL,
  leader_index INTEGER DEFAULT 0,
  win_rate NUMERIC(6,3) DEFAULT 0,
  pick_rate NUMERIC(6,3) DEFAULT 0,
  tier TEXT DEFAULT 'User',
  battle_type TEXT DEFAULT 'SIEGE',
  source TEXT DEFAULT 'user',
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  mongo_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_monsters_family_id ON monsters(family_id);
CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
CREATE INDEX IF NOT EXISTS idx_skills_swarfarm_id ON skills(swarfarm_id);
CREATE INDEX IF NOT EXISTS idx_defenses_updated_at ON defenses(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_defenses_monsters_gin ON defenses USING GIN (monsters);