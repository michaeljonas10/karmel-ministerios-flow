-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name    TEXT,
  user_email   TEXT,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  screenshot_url TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing by user and status
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx  ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_created_idx ON support_tickets(created_at DESC);

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tickets
CREATE POLICY "users_insert_own_tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own tickets
CREATE POLICY "users_read_own_tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own open tickets (e.g. add info)
CREATE POLICY "users_update_own_open_tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'open');

-- Admins (service_role) bypass RLS — handled via Edge Function
-- Also allow admins identified by user_profiles.role = 'admin' to read/update all
CREATE POLICY "admins_read_all_tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "admins_update_all_tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Storage bucket for ticket screenshots (created via API in app)
-- Bucket name: ticket-screenshots (public read, authenticated write)
