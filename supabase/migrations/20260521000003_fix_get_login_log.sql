-- Corrige referência ambígua de coluna na função get_login_log
-- "id" era ambíguo entre a coluna de retorno e user_profiles.id
CREATE OR REPLACE FUNCTION get_login_log(p_limit int DEFAULT 200)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  user_name   text,
  user_email  text,
  user_role   text,
  logged_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  -- Captura o UID do chamador antes de qualquer consulta
  v_caller_id := auth.uid();

  -- Verifica se quem chama é super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles up
     WHERE up.id = v_caller_id AND up.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
    SELECT l.id, l.user_id, l.user_name, l.user_email, l.user_role, l.logged_in_at
      FROM login_log l
     ORDER BY l.logged_in_at DESC
     LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_login_log TO authenticated;
