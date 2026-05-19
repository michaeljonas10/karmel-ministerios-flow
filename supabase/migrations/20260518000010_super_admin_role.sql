-- Add super_admin role to the check constraint
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'ministry_leader', 'coordinator'));

-- Promote michaeljonas@live.com to super_admin
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'michaeljonas@live.com';

-- Ensure michael.j.a.souza@gmail.com is admin
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'michael.j.a.souza@gmail.com';
