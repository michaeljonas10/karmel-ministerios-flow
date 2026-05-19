-- Block 1: volunteer profile enrichment
ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0;
