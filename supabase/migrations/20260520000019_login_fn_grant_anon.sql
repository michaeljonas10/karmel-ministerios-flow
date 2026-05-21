-- Permite que o cliente chame mesmo antes do JWT estar propagado
GRANT EXECUTE ON FUNCTION log_user_login TO anon;
