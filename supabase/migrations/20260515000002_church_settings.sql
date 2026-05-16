CREATE TABLE IF NOT EXISTS church_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  church_name TEXT DEFAULT 'Igreja Karmel',
  subtitle TEXT DEFAULT 'Lagoinha BH',
  cnpj TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  website TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read church_settings" ON church_settings FOR SELECT USING (true);
CREATE POLICY "Public write church_settings" ON church_settings FOR ALL USING (true);

-- Insert default record
INSERT INTO church_settings (id, church_name, subtitle)
VALUES ('main', 'Igreja Karmel', 'Lagoinha BH')
ON CONFLICT (id) DO NOTHING;

-- ministry_coordinators table for editable coordinators
CREATE TABLE IF NOT EXISTS ministry_coordinators (
  ministry_id TEXT PRIMARY KEY,
  coordinators TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE ministry_coordinators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ministry_coordinators" ON ministry_coordinators FOR SELECT USING (true);
CREATE POLICY "Public write ministry_coordinators" ON ministry_coordinators FOR ALL USING (true);
