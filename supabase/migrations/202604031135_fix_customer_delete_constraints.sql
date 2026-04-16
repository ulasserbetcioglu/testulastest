-- Mitigation for Customer Delete Constraints Fix
-- Date: 2026-04-03

-- 1. Update branch_pest_risk_assessments table constraints
ALTER TABLE branch_pest_risk_assessments
DROP CONSTRAINT IF EXISTS branch_pest_risk_assessments_customer_id_fkey,
ADD CONSTRAINT branch_pest_risk_assessments_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES customers(id)
  ON DELETE CASCADE;

ALTER TABLE branch_pest_risk_assessments
DROP CONSTRAINT IF EXISTS branch_pest_risk_assessments_branch_id_fkey,
ADD CONSTRAINT branch_pest_risk_assessments_branch_id_fkey
  FOREIGN KEY (branch_id)
  REFERENCES branches(id)
  ON DELETE CASCADE;

-- 2. Update reconciliation_responses table constraints
ALTER TABLE reconciliation_responses
DROP CONSTRAINT IF EXISTS reconciliation_responses_customer_id_fkey,
ADD CONSTRAINT reconciliation_responses_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES customers(id)
  ON DELETE CASCADE;
