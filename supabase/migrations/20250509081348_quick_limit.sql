/*
  # Add automatic warehouse creation for operators
  
  1. Changes
    - Create trigger function to create warehouse for new operators
    - Add trigger to operators table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Create function to generate warehouse code
CREATE OR REPLACE FUNCTION generate_warehouse_code(operator_name text)
RETURNS text AS $$
BEGIN
  RETURN UPPER(
    REGEXP_REPLACE(
      SUBSTR(
        REGEXP_REPLACE(operator_name, '[^a-zA-Z0-9]', '', 'g'),
        1, 
        10
      ),
      '([A-Z0-9]{3})([A-Z0-9]*)',
      '\1-\2'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to handle automatic warehouse creation
CREATE OR REPLACE FUNCTION create_operator_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  -- Create warehouse for the new operator
  INSERT INTO warehouses (
    name,
    code,
    operator_id,
    is_active
  ) VALUES (
    NEW.name || ' Deposu',
    generate_warehouse_code(NEW.name),
    NEW.id,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS create_operator_warehouse_trigger ON operators;
CREATE TRIGGER create_operator_warehouse_trigger
  AFTER INSERT ON operators
  FOR EACH ROW
  EXECUTE FUNCTION create_operator_warehouse();