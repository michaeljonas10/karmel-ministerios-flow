-- Volunteer archiving
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Edit history log
CREATE TABLE IF NOT EXISTS volunteer_edit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id text NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  field       text NOT NULL,
  old_value   text,
  new_value   text,
  changed_by  text,
  changed_at  timestamptz DEFAULT now()
);

ALTER TABLE volunteer_edit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage edit log"
  ON volunteer_edit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
