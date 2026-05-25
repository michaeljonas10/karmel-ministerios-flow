-- ── 1. Quem fez a mudança de etapa ───────────────────────────────────────────
ALTER TABLE stage_history ADD COLUMN IF NOT EXISTS changed_by TEXT;

-- ── 2. Log de contatos WhatsApp ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id TEXT REFERENCES volunteers(id) ON DELETE CASCADE,
  contacted_by TEXT NOT NULL,
  contacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage contact_log"
  ON contact_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
