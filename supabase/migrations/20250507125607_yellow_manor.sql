/*
  # Remove checklist form related tables
  
  1. Changes
    - Drop all checklist form related tables
    - Remove foreign key constraints
    - Clean up any remaining references
*/

-- Drop checklist form related tables
DROP TABLE IF EXISTS checklist_paid_products CASCADE;
DROP TABLE IF EXISTS checklist_products CASCADE;
DROP TABLE IF EXISTS checklist_pests CASCADE;
DROP TABLE IF EXISTS checklist_equipments CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;