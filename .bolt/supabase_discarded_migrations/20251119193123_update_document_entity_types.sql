/*
  # Update document entity types

  1. Changes
    - Update entity_type values from old system to new system
    - Old: 'general', 'customer', 'branch', 'operator'
    - New: 'internal' (for firm and operators), 'public' (for everyone)

  2. Migration Strategy
    - Convert 'operator' to 'internal'
    - Convert 'general', 'customer', 'branch' to 'public'
*/

-- Update existing documents to new entity types
UPDATE documents 
SET entity_type = 'internal' 
WHERE entity_type = 'operator';

UPDATE documents 
SET entity_type = 'public' 
WHERE entity_type IN ('general', 'customer', 'branch');
