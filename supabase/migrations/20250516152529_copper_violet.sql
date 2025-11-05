/*
  # Add vehicles management tables
  
  1. New Tables
    - `vehicles`: Store vehicle information
    - `vehicle_maintenance`: Store maintenance records
    - `vehicle_locations`: Store location history
    
  2. Security
    - Enable RLS
    - Add policies for admin and operators
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL UNIQUE,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text,
  vin text,
  current_km integer DEFAULT 0,
  fuel_type text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  operator_id uuid REFERENCES operators(id) ON DELETE SET NULL,
  insurance_expiry date,
  inspection_expiry date,
  insurance_policy_number text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle maintenance table
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL,
  maintenance_date date NOT NULL,
  km_at_maintenance integer NOT NULL,
  description text,
  cost numeric,
  performed_by text,
  next_maintenance_date date,
  next_maintenance_km integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle locations table
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  recorded_at timestamptz NOT NULL,
  speed numeric,
  heading numeric,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicles
CREATE POLICY "Enable read access for authenticated users" ON vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON vehicles
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin and assigned operators" ON vehicles
  FOR UPDATE TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators
      WHERE operators.id = vehicles.operator_id
      AND operators.auth_id = auth.uid()
    )
  );

CREATE POLICY "Enable delete access for admin" ON vehicles
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for vehicle_maintenance
CREATE POLICY "Enable read access for authenticated users" ON vehicle_maintenance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin and assigned operators" ON vehicle_maintenance
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM vehicles
      JOIN operators ON vehicles.operator_id = operators.id
      WHERE vehicles.id = vehicle_maintenance.vehicle_id
      AND operators.auth_id = auth.uid()
    )
  );

CREATE POLICY "Enable update access for admin and assigned operators" ON vehicle_maintenance
  FOR UPDATE TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM vehicles
      JOIN operators ON vehicles.operator_id = operators.id
      WHERE vehicles.id = vehicle_maintenance.vehicle_id
      AND operators.auth_id = auth.uid()
    )
  );

CREATE POLICY "Enable delete access for admin" ON vehicle_maintenance
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for vehicle_locations
CREATE POLICY "Enable read access for authenticated users" ON vehicle_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin and assigned operators" ON vehicle_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM vehicles
      JOIN operators ON vehicles.operator_id = operators.id
      WHERE vehicles.id = vehicle_locations.vehicle_id
      AND operators.auth_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS vehicles_operator_id_idx ON vehicles(operator_id);
CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles(status);
CREATE INDEX IF NOT EXISTS vehicles_plate_number_idx ON vehicles(plate_number);

CREATE INDEX IF NOT EXISTS vehicle_maintenance_vehicle_id_idx ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_maintenance_maintenance_date_idx ON vehicle_maintenance(maintenance_date);

CREATE INDEX IF NOT EXISTS vehicle_locations_vehicle_id_idx ON vehicle_locations(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_locations_recorded_at_idx ON vehicle_locations(recorded_at);
CREATE INDEX IF NOT EXISTS vehicle_locations_coordinates_idx ON vehicle_locations USING gist (point(longitude, latitude));