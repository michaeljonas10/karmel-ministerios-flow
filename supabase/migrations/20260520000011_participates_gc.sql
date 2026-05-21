-- Add GC (Grupo de Células) participation field to volunteers
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS participates_gc boolean;
