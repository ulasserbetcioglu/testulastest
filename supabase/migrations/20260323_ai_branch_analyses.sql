-- ai_branch_analyses: stores Gemini AI analysis results per branch
-- NOTE: UNIQUE on branch_id so upsert works (one record per branch)
CREATE TABLE IF NOT EXISTS ai_branch_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  analysis_text text NOT NULL,
  visit_count integer DEFAULT 0,
  top_pests text[] DEFAULT '{}',
  model_used text DEFAULT 'gemini-flash-latest',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_branch_analyses_customer_id ON ai_branch_analyses(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_branch_analyses_created_at ON ai_branch_analyses(created_at DESC);

-- RLS
ALTER TABLE ai_branch_analyses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access
CREATE POLICY "Authenticated users can manage ai analyses"
  ON ai_branch_analyses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon (for customer portal)
CREATE POLICY "Anon users can manage ai analyses"
  ON ai_branch_analyses
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_branch_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_branch_analyses_updated_at ON ai_branch_analyses;
CREATE TRIGGER ai_branch_analyses_updated_at
  BEFORE UPDATE ON ai_branch_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_branch_analyses_updated_at();
