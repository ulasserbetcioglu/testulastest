/*
  # Add customer related tables

  1. New Tables
    - `branches`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `sube_adi` (text)
      - `adres` (text)
      - `sehir` (text)
      - `telefon` (text)
      - `email` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `treatments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `branch_id` (uuid, foreign key, nullable)
      - `operator_id` (uuid, foreign key)
      - `tarih` (timestamptz)
      - `tur` (text)
      - `durum` (text)
      - `notlar` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `offers`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `branch_id` (uuid, foreign key, nullable)
      - `teklif_no` (text, unique)
      - `tarih` (timestamptz)
      - `gecerlilik` (timestamptz)
      - `tur` (text)
      - `durum` (text)
      - `tutar` (numeric)
      - `aciklama` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  sube_adi text NOT NULL,
  adres text,
  sehir text,
  telefon text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON branches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON branches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON branches
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON branches
  FOR DELETE TO authenticated USING (true);

-- Treatments table
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  operator_id uuid NOT NULL,
  tarih timestamptz NOT NULL,
  tur text NOT NULL,
  durum text NOT NULL,
  notlar text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON treatments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON treatments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON treatments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON treatments
  FOR DELETE TO authenticated USING (true);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  teklif_no text UNIQUE NOT NULL,
  tarih timestamptz NOT NULL,
  gecerlilik timestamptz NOT NULL,
  tur text NOT NULL,
  durum text NOT NULL,
  tutar numeric NOT NULL,
  aciklama text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON offers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON offers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON offers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON offers
  FOR DELETE TO authenticated USING (true);