-- Função SECURITY DEFINER: o cliente não precisa ter JWT confirmado
-- para fazer o insert; a função roda com privilégio do owner (postgres)
CREATE OR REPLACE FUNCTION log_user_login(
  p_user_id uuid,
  p_user_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_user_role text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO login_log (user_id, user_name, user_email, user_role)
  VALUES (p_user_id, p_user_name, p_user_email, p_user_role);
END;
$$;

-- Qualquer usuário autenticado pode chamar
GRANT EXECUTE ON FUNCTION log_user_login TO authenticated;
