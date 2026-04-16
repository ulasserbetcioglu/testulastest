-- Create paid material sales table
CREATE TABLE IF NOT EXISTS paid_material_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  sale_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'invoiced', 'paid')),
  total_amount numeric NOT NULL DEFAULT 0,
  invoice_number text,
  invoice_date date,
  payment_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create paid material sale items table
CREATE TABLE IF NOT EXISTS paid_material_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES paid_material_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES paid_products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE paid_material_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE paid_material_sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for paid_material_sales
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable read access for authenticated users' AND polrelid = 'paid_material_sales'::regclass) THEN
        CREATE POLICY "Enable read access for authenticated users" ON paid_material_sales FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable insert access for authenticated users' AND polrelid = 'paid_material_sales'::regclass) THEN
        CREATE POLICY "Enable insert access for authenticated users" ON paid_material_sales FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable update access for admin' AND polrelid = 'paid_material_sales'::regclass) THEN
        CREATE POLICY "Enable update access for admin" ON paid_material_sales FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com'::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable delete access for admin' AND polrelid = 'paid_material_sales'::regclass) THEN
        CREATE POLICY "Enable delete access for admin" ON paid_material_sales FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com'::text);
    END IF;
END$$;

-- Create policies for paid_material_sale_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable read access for authenticated users' AND polrelid = 'paid_material_sale_items'::regclass) THEN
        CREATE POLICY "Enable read access for authenticated users" ON paid_material_sale_items FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable insert access for authenticated users' AND polrelid = 'paid_material_sale_items'::regclass) THEN
        CREATE POLICY "Enable insert access for authenticated users" ON paid_material_sale_items FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable update access for admin' AND polrelid = 'paid_material_sale_items'::regclass) THEN
        CREATE POLICY "Enable update access for admin" ON paid_material_sale_items FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com'::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable delete access for admin' AND polrelid = 'paid_material_sale_items'::regclass) THEN
        CREATE POLICY "Enable delete access for admin" ON paid_material_sale_items FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com'::text);
    END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS paid_material_sales_customer_id_idx ON paid_material_sales(customer_id);
CREATE INDEX IF NOT EXISTS paid_material_sales_branch_id_idx ON paid_material_sales(branch_id);
CREATE INDEX IF NOT EXISTS paid_material_sales_visit_id_idx ON paid_material_sales(visit_id);
CREATE INDEX IF NOT EXISTS paid_material_sales_status_idx ON paid_material_sales(status);
CREATE INDEX IF NOT EXISTS paid_material_sales_sale_date_idx ON paid_material_sales(sale_date);

CREATE INDEX IF NOT EXISTS paid_material_sale_items_sale_id_idx ON paid_material_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS paid_material_sale_items_product_id_idx ON paid_material_sale_items(product_id);
