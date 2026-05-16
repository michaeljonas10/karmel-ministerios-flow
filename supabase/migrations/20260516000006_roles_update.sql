-- Add ministry_leader role
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'ministry_leader', 'coordinator'));

-- sub_areas: array of sub-area IDs managed by a coordinator
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sub_areas TEXT[] DEFAULT '{}';
