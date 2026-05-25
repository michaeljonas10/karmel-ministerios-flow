-- Campo para plataformas/ferramentas que o voluntário domina
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}';
