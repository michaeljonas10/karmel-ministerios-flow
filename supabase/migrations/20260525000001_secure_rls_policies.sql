-- ─────────────────────────────────────────────────────────────────────────────
-- Secure RLS: remove all "public" (unauthenticated) read/write policies that
-- expose volunteer personal data. Keep only what the /cadastro public form
-- strictly needs (ministry/sub_area lists, church settings, and volunteer INSERT).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. VOLUNTEERS ─────────────────────────────────────────────────────────────
-- Drop over-permissive policies created in the initial demo schema
DROP POLICY IF EXISTS "Public read volunteers"  ON volunteers;
DROP POLICY IF EXISTS "Public write volunteers" ON volunteers;

-- Only authenticated users can read volunteer data
CREATE POLICY "Authenticated read volunteers"
  ON volunteers FOR SELECT
  TO authenticated
  USING (true);

-- Anon + authenticated can INSERT (public /cadastro form)
CREATE POLICY "Public insert volunteers"
  ON volunteers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can update/delete
CREATE POLICY "Authenticated update volunteers"
  ON volunteers FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete volunteers"
  ON volunteers FOR DELETE
  TO authenticated
  USING (true);


-- ── 2. STAGE_HISTORY ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read stage_history"  ON stage_history;
DROP POLICY IF EXISTS "Public write stage_history" ON stage_history;

CREATE POLICY "Authenticated read stage_history"
  ON stage_history FOR SELECT
  TO authenticated
  USING (true);

-- Anon can INSERT the initial 'cadastrado' stage from the public form
CREATE POLICY "Public insert stage_history"
  ON stage_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update stage_history"
  ON stage_history FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete stage_history"
  ON stage_history FOR DELETE
  TO authenticated
  USING (true);


-- ── 3. MINISTRIES — keep public read, restrict writes ─────────────────────────
DROP POLICY IF EXISTS "Public write ministries" ON ministries;

CREATE POLICY "Authenticated write ministries"
  ON ministries FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);


-- ── 4. SUB_AREAS — keep public read, restrict writes ─────────────────────────
DROP POLICY IF EXISTS "Public write sub_areas" ON sub_areas;

CREATE POLICY "Authenticated write sub_areas"
  ON sub_areas FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);


-- ── 5. USER_PROFILES ─────────────────────────────────────────────────────────
-- Profile creation is handled by the handle_new_user() trigger (SECURITY DEFINER)
-- so anon write is not needed.
DROP POLICY IF EXISTS "Public read profiles"  ON user_profiles;
DROP POLICY IF EXISTS "Public write profiles" ON user_profiles;

-- Authenticated users can read all profiles (needed for coordinator name lookups)
CREATE POLICY "Authenticated read profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile row
CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ── 6. CHURCH_SETTINGS — keep public read, restrict writes ───────────────────
DROP POLICY IF EXISTS "Public write church_settings" ON church_settings;

CREATE POLICY "Authenticated write church_settings"
  ON church_settings FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);


-- ── 7. MINISTRY_COORDINATORS — keep public read, restrict writes ──────────────
DROP POLICY IF EXISTS "Public write ministry_coordinators" ON ministry_coordinators;

CREATE POLICY "Authenticated write ministry_coordinators"
  ON ministry_coordinators FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);


-- ── 8. VOLUNTEER_EDIT_LOG ─────────────────────────────────────────────────────
-- Already authenticated-only; nothing to change.


-- ── 9. PHONE CHECK FUNCTION (safe for anon callers) ──────────────────────────
-- Replaces the direct SELECT on volunteers used in the /cadastro duplicate check.
-- Returns only { exists, name } — no phone, email, or other PII.
CREATE OR REPLACE FUNCTION public_check_phone(p_phone_suffix text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT name INTO v_name
  FROM volunteers
  WHERE phone ILIKE '%' || p_phone_suffix || '%'
    AND archived_at IS NULL
  LIMIT 1;

  RETURN json_build_object(
    'exists', v_name IS NOT NULL,
    'name',   v_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public_check_phone(text) TO anon, authenticated;
