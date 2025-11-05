/*
  # Operatör Atama ve Aylık Ziyaret Planı

  1. Yeni Sütunlar
    - `customers` tablosuna:
      - `assigned_operator_id` - Atanmış operatör
    - `branches` tablosuna:
      - `assigned_operator_id` - Şubeye atanmış operatör
  
  2. Yeni Tablo
    - `monthly_visit_schedules`
      - Müşteri veya şube için aylık ziyaret sayısını saklar
      - Ay bazında farklı sayılar belirlenebilir
      
  3. Güvenlik
    - RLS politikaları eklendi
*/

-- Add assigned_operator_id to customers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'assigned_operator_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN assigned_operator_id uuid REFERENCES operators(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add assigned_operator_id to branches table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'assigned_operator_id'
  ) THEN
    ALTER TABLE branches ADD COLUMN assigned_operator_id uuid REFERENCES operators(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create monthly_visit_schedules table
CREATE TABLE IF NOT EXISTS monthly_visit_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  visits_required integer NOT NULL DEFAULT 1 CHECK (visits_required >= 0),
  year integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT month_schedule_unique UNIQUE (customer_id, branch_id, month, year),
  CONSTRAINT customer_or_branch_required CHECK (
    (customer_id IS NOT NULL AND branch_id IS NULL) OR 
    (customer_id IS NULL AND branch_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE monthly_visit_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_visit_schedules
CREATE POLICY "Authenticated users can view visit schedules"
  ON monthly_visit_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert visit schedules"
  ON monthly_visit_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update visit schedules"
  ON monthly_visit_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete visit schedules"
  ON monthly_visit_schedules FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_customer ON monthly_visit_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_branch ON monthly_visit_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_month ON monthly_visit_schedules(month, year);
CREATE INDEX IF NOT EXISTS idx_customers_operator ON customers(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_branches_operator ON branches(assigned_operator_id);
