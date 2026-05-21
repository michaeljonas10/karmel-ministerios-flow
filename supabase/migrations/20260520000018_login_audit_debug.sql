-- Função diagnóstico: retorna todas as actions distintas do audit log
CREATE OR REPLACE FUNCTION debug_audit_actions()
RETURNS TABLE (action text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    payload->>'action' AS action,
    COUNT(*) AS count
  FROM auth.audit_log_entries
  GROUP BY payload->>'action'
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION debug_audit_actions TO service_role;

-- Atualiza get_login_audit_entries para incluir mais tipos de login
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
    COALESCE(
      (payload->>'actor_id')::uuid,
      (payload->>'user_id')::uuid
    ) AS actor_id,
    COALESCE(
      payload->>'actor_username',
      payload->>'email'
    ) AS actor_email,
    created_at
  FROM auth.audit_log_entries
  WHERE payload->>'action' IN ('login', 'user_signedin', 'token_refreshed', 'user_recovery_requested')
    AND (payload->>'actor_id' IS NOT NULL OR payload->>'user_id' IS NOT NULL)
  ORDER BY created_at ASC;
$$;
