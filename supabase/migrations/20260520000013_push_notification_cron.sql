-- Enable pg_net if not already enabled (pg_cron is enabled by default on Supabase)
create extension if not exists pg_net;

-- Daily push notification job at 8am UTC (5am BRT)
-- Uses anon key as bearer (the edge function only verifies Bearer presence for cron calls)
select cron.schedule(
  'daily-push-notifications',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://fzbxzcwopgwsojxmckpa.supabase.co/functions/v1/send-push-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Ynh6Y3dvcGd3c29qeG1ja3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Nzc3NDUsImV4cCI6MjA5NDQ1Mzc0NX0.YKUUsWo99Nij4KUAhNztCcZDpYjl52vjE4s7pNl-Cm0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
