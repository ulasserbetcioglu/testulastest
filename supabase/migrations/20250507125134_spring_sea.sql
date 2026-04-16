/*
  # Remove checklists functionality
  
  1. Changes
    - Drop all checklist-related tables
    - Remove foreign key constraints
    - Clean up any related data
    
  2. Security
    - Maintain RLS on remaining tables
*/

-- Drop checklist-related tables in correct order
DROP TABLE IF EXISTS checklist_products CASCADE;
DROP TABLE IF EXISTS checklist_pests CASCADE;
DROP TABLE IF EXISTS checklist_equipments CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;