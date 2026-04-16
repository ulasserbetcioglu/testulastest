/*
  # Add foreign key relationship for treatments.operator_id

  1. Changes
    - Add foreign key constraint to link treatments.operator_id to operators.id
    - Set ON DELETE CASCADE to maintain referential integrity
    
  2. Security
    - No changes to RLS policies
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'treatments_operator_id_fkey'
  ) THEN
    ALTER TABLE treatments
    ADD CONSTRAINT treatments_operator_id_fkey
    FOREIGN KEY (operator_id) REFERENCES operators(id)
    ON DELETE CASCADE;
  END IF;
END $$;