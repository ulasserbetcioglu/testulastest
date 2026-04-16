/*
  # Update definition tables structure

  1. Changes
    - Add common fields to all definition tables
    - Update existing tables to match new structure
    - Add proper constraints and indexes
    
  2. Security
    - Maintain existing RLS policies
    - Keep admin-only modification restrictions
*/

-- Update pests table
ALTER TABLE pests
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0,
  ADD CONSTRAINT pests_code_key UNIQUE (code);

CREATE INDEX IF NOT EXISTS pests_type_idx ON pests (type);
CREATE INDEX IF NOT EXISTS pests_order_no_idx ON pests (order_no);

-- Update equipment table
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0,
  ADD CONSTRAINT equipment_code_key UNIQUE (code);

CREATE INDEX IF NOT EXISTS equipment_type_idx ON equipment (type);
CREATE INDEX IF NOT EXISTS equipment_order_no_idx ON equipment (order_no);

-- Update biocidal_products table
ALTER TABLE biocidal_products
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0,
  ADD CONSTRAINT biocidal_products_code_key UNIQUE (code);

CREATE INDEX IF NOT EXISTS biocidal_products_type_idx ON biocidal_products (type);
CREATE INDEX IF NOT EXISTS biocidal_products_order_no_idx ON biocidal_products (order_no);

-- Update application_types table
ALTER TABLE application_types
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0,
  ADD CONSTRAINT application_types_code_key UNIQUE (code);

CREATE INDEX IF NOT EXISTS application_types_type_idx ON application_types (type);
CREATE INDEX IF NOT EXISTS application_types_order_no_idx ON application_types (order_no);

-- Update existing application types with codes
UPDATE application_types SET code = 'FIRST' WHERE name = 'İlk';
UPDATE application_types SET code = 'PAID' WHERE name = 'Ücretli';
UPDATE application_types SET code = 'EMERGENCY' WHERE name = 'Acil Çağrı';
UPDATE application_types SET code = 'TECHNICAL' WHERE name = 'Teknik İnceleme';
UPDATE application_types SET code = 'PERIODIC' WHERE name = 'Periyodik';
UPDATE application_types SET code = 'WORKPLACE' WHERE name = 'İşyeri';
UPDATE application_types SET code = 'OBSERVATION' WHERE name = 'Gözlem';
UPDATE application_types SET code = 'LAST' WHERE name = 'Son';