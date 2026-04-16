-- Add show_visit_frequency column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS show_visit_frequency BOOLEAN DEFAULT true;
