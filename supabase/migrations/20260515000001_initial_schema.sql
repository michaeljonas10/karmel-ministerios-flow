-- Enable RLS but allow public read for now (demo app)
CREATE TABLE IF NOT EXISTS ministries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  coordinators TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sub_areas (
  id TEXT PRIMARY KEY,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coordinator TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ministry_id TEXT REFERENCES ministries(id),
  sub_area TEXT NOT NULL,
  coordinator TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'cadastrado',
  notes TEXT DEFAULT '',
  last_contact_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_days INTEGER
);

CREATE TABLE IF NOT EXISTS stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id TEXT REFERENCES volunteers(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

-- Enable RLS
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access (demo — no auth required)
CREATE POLICY "Public read ministries" ON ministries FOR SELECT USING (true);
CREATE POLICY "Public read sub_areas" ON sub_areas FOR SELECT USING (true);
CREATE POLICY "Public read volunteers" ON volunteers FOR SELECT USING (true);
CREATE POLICY "Public read stage_history" ON stage_history FOR SELECT USING (true);

-- Allow public write (demo app)
CREATE POLICY "Public write volunteers" ON volunteers FOR ALL USING (true);
CREATE POLICY "Public write stage_history" ON stage_history FOR ALL USING (true);
