-- v2: DROP + CREATE para poder alterar a assinatura
-- A função agora faz o lookup do perfil internamente (SECURITY DEFINER)
DROP FUNCTION IF EXISTS log_user_login(uuid, text, text, text);

CREATE FUNCTION log_user_login(
  p_user_id    uuid,
  p_user_name  text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_user_role  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name  text;
  v_role  text;
  v_email text;
BEGIN
  -- Busca perfil internamente (SECURITY DEFINER ignora RLS)
  SELECT name, role, email
    INTO v_name, v_role, v_email
    FROM user_profiles
   WHERE id = p_user_id;

  -- Insere; não falha se perfil ainda não existir (v_* ficam NULL)
  INSERT INTO login_log (user_id, user_name, user_email, user_role)
  VALUES (
    p_user_id,
    COALESCE(v_name, p_user_name),
    COALESCE(v_email, p_user_email),
    COALESCE(v_role, p_user_role)
  );
END;
$$;

-- Garantir grants explícitos
GRANT EXECUTE ON FUNCTION log_user_login TO authenticated, anon;
