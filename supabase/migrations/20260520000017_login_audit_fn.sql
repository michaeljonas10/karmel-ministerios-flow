-- Função que lê auth.audit_log_entries (schema auth, inacessível direto pelo JS client)
-- Retorna apenas eventos de login real (não refreshes)
CREATE OR REPLACE FUNCTION get_login_audit_entries()
RETURNS TABLE (
  actor_id uuid,
  actor_email text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    (payload->>'actor_id')::uuid AS actor_id,
    payload->>'actor_username'   AS actor_email,
    created_at
  FROM auth.audit_log_entries
  WHERE payload->>'action' = 'login'
  ORDER BY created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_login_audit_entries TO service_role;
