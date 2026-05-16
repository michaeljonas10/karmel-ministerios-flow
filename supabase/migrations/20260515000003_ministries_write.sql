-- Allow write access to ministries and sub_areas (demo app, no auth)
CREATE POLICY "Public write ministries" ON ministries FOR ALL USING (true);
CREATE POLICY "Public write sub_areas" ON sub_areas FOR ALL USING (true);
