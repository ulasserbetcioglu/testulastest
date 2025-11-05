/*
  # Remove warehouse and warehouse transfer tables
  
  1. Changes
    - Drop warehouse_transfers table
    - Drop warehouse_items table
    - Drop warehouses table
    - Drop related functions and triggers
    
  2. Security
    - Clean removal of all related database objects
*/

-- Drop tables in the correct order to respect foreign key constraints
DROP TABLE IF EXISTS warehouse_transfers CASCADE;
DROP TABLE IF EXISTS warehouse_items CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_warehouse_code CASCADE;
DROP FUNCTION IF EXISTS create_operator_warehouse CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS create_operator_warehouse_trigger ON operators CASCADE;