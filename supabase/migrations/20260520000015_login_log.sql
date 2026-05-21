CREATE TABLE IF NOT EXISTS login_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  user_email text,
  user_role text,
  logged_in_at timestamptz DEFAULT now()
);

-- Only super_admin can read; anyone authenticated can insert their own row
ALTER TABLE login_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin can read login_log"
  ON login_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "users can insert own login"
  ON login_log FOR INSERT
  WITH CHECK (user_id = auth.uid());
