/*
  # Add remaining anon policies for operator local auth

  Complete set of missing anon policies for operators using local auth.

  1. ekipmantrend - INSERT, UPDATE, DELETE (triggered by visits.equipment_checks update)
  2. offers - INSERT, UPDATE, DELETE (operators create offers via NewOffer)
  3. offer_items - SELECT, INSERT, DELETE (offer line items)
  4. offer_templates - SELECT (templates for creating offers)
  5. offer_template_sections - SELECT (template sections)
  6. proposals - INSERT (HizmetPazarlama creates proposals)
  7. proposal_items - INSERT (proposal line items)
  8. company_settings - UPDATE, INSERT (HizmetPazarlama footer settings)
  9. branch_equipment - INSERT, UPDATE (equipment management during visits)
  10. paid_material_sale_items - UPDATE, DELETE (editing paid material sales)
  11. equipment - INSERT, UPDATE (operators may manage equipment)
*/

-- 1. ekipmantrend: anon INSERT, UPDATE, DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert ekipmantrend' AND polrelid = 'public.ekipmantrend'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert ekipmantrend"
      ON public.ekipmantrend FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update ekipmantrend' AND polrelid = 'public.ekipmantrend'::regclass
  ) THEN
    CREATE POLICY "Allow anon update ekipmantrend"
      ON public.ekipmantrend FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon delete ekipmantrend' AND polrelid = 'public.ekipmantrend'::regclass
  ) THEN
    CREATE POLICY "Allow anon delete ekipmantrend"
      ON public.ekipmantrend FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 2. offers: anon INSERT, UPDATE, DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert offers' AND polrelid = 'public.offers'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert offers"
      ON public.offers FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update offers' AND polrelid = 'public.offers'::regclass
  ) THEN
    CREATE POLICY "Allow anon update offers"
      ON public.offers FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon delete offers' AND polrelid = 'public.offers'::regclass
  ) THEN
    CREATE POLICY "Allow anon delete offers"
      ON public.offers FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 3. offer_items: anon SELECT, INSERT, DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read offer_items' AND polrelid = 'public.offer_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon read offer_items"
      ON public.offer_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert offer_items' AND polrelid = 'public.offer_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert offer_items"
      ON public.offer_items FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon delete offer_items' AND polrelid = 'public.offer_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon delete offer_items"
      ON public.offer_items FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 4. offer_templates: anon SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read offer_templates' AND polrelid = 'public.offer_templates'::regclass
  ) THEN
    CREATE POLICY "Allow anon read offer_templates"
      ON public.offer_templates FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 5. offer_template_sections: anon SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read offer_template_sections' AND polrelid = 'public.offer_template_sections'::regclass
  ) THEN
    CREATE POLICY "Allow anon read offer_template_sections"
      ON public.offer_template_sections FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 6. proposals: anon INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert proposals' AND polrelid = 'public.proposals'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert proposals"
      ON public.proposals FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- 7. proposal_items: anon INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert proposal_items' AND polrelid = 'public.proposal_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert proposal_items"
      ON public.proposal_items FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- 8. company_settings: anon UPDATE, INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update company_settings' AND polrelid = 'public.company_settings'::regclass
  ) THEN
    CREATE POLICY "Allow anon update company_settings"
      ON public.company_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert company_settings' AND polrelid = 'public.company_settings'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert company_settings"
      ON public.company_settings FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- 9. branch_equipment: anon INSERT, UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert branch_equipment' AND polrelid = 'public.branch_equipment'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert branch_equipment"
      ON public.branch_equipment FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update branch_equipment' AND polrelid = 'public.branch_equipment'::regclass
  ) THEN
    CREATE POLICY "Allow anon update branch_equipment"
      ON public.branch_equipment FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. paid_material_sale_items: anon UPDATE, DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update paid_material_sale_items' AND polrelid = 'public.paid_material_sale_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon update paid_material_sale_items"
      ON public.paid_material_sale_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon delete paid_material_sale_items' AND polrelid = 'public.paid_material_sale_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon delete paid_material_sale_items"
      ON public.paid_material_sale_items FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- 11. equipment: anon INSERT, UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert equipment' AND polrelid = 'public.equipment'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert equipment"
      ON public.equipment FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update equipment' AND polrelid = 'public.equipment'::regclass
  ) THEN
    CREATE POLICY "Allow anon update equipment"
      ON public.equipment FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
