-- Function to merge customers
-- target_id: The customer to keep
-- source_id: The customer to merge (will be deleted)
-- as_branch: If true, source_id becomes a branch of target_id. If false, merges as main customer.

CREATE OR REPLACE FUNCTION merge_customers(target_id uuid, source_id uuid, as_branch boolean DEFAULT false)
RETURNS void AS $$
DECLARE
    new_branch_id uuid;
    source_customer_name text;
BEGIN
    -- 1. Get source customer name for potential branch creation
    SELECT kisa_isim INTO source_customer_name FROM customers WHERE id = source_id;

    -- 2. If merging as branch, create a new branch under target_id
    IF as_branch THEN
        INSERT INTO branches (customer_id, sube_adi)
        VALUES (target_id, source_customer_name)
        RETURNING id INTO new_branch_id;
    END IF;

    -- 3. Update all tables referencing customer_id and/or branch_id
    
    -- Branches: Move existing branches of source to target
    UPDATE branches SET customer_id = target_id WHERE customer_id = source_id;

    -- Visits
    IF as_branch THEN
        UPDATE visits SET customer_id = target_id, branch_id = new_branch_id WHERE customer_id = source_id;
        UPDATE visits SET customer_id = target_id WHERE customer_id = source_id; -- Safety check
    ELSE
        UPDATE visits SET customer_id = target_id WHERE customer_id = source_id;
    END IF;

    -- Monthly Visit Schedules
    IF as_branch THEN
        UPDATE monthly_visit_schedules SET customer_id = target_id, branch_id = new_branch_id WHERE customer_id = source_id;
        UPDATE monthly_visit_schedules SET customer_id = target_id WHERE customer_id = source_id;
    ELSE
        UPDATE monthly_visit_schedules SET customer_id = target_id WHERE customer_id = source_id;
    END IF;

    -- Ekipman Trend
    IF as_branch THEN
        UPDATE ekipmantrend SET branch_id = new_branch_id WHERE branch_id IN (SELECT id FROM branches WHERE customer_id = source_id);
        -- Note: ekipmantrend usually links via branch_id which is already updated via branches update or above
    END IF;

    -- Branch Pest Risk Assessments
    IF as_branch THEN
        UPDATE branch_pest_risk_assessments SET customer_id = target_id, branch_id = new_branch_id WHERE customer_id = source_id;
    ELSE
        UPDATE branch_pest_risk_assessments SET customer_id = target_id WHERE customer_id = source_id;
    END IF;

    -- AI Branch Analyses
    IF as_branch THEN
        UPDATE ai_branch_analyses SET customer_id = target_id, branch_id = new_branch_id WHERE customer_id = source_id;
    ELSE
        UPDATE ai_branch_analyses SET customer_id = target_id WHERE customer_id = source_id;
    END IF;

    -- Reconciliation Responses
    UPDATE reconciliation_responses SET customer_id = target_id WHERE customer_id = source_id;

    -- Pest Activity Limits
    IF as_branch THEN
        UPDATE pest_activity_limits SET customer_id = target_id, branch_id = new_branch_id WHERE customer_id = source_id;
    ELSE
        UPDATE pest_activity_limits SET customer_id = target_id WHERE customer_id = source_id;
    END IF;

    -- IPM Contracts
    UPDATE ipm_contracts SET customer_id = target_id WHERE customer_id = source_id;

    -- Customer Pricing
    -- Note: We might want to keep target's pricing, so we only migrate if target doesn't have it
    -- Or we delete source's pricing to avoid conflict
    DELETE FROM customer_pricing WHERE customer_id = source_id;

    -- Corrective Actions
    IF as_branch THEN
        UPDATE corrective_actions SET customer_id = target_id, branch_id = new_branch_id WHERE customer_id = source_id;
    ELSE
        UPDATE corrective_actions SET customer_id = target_id WHERE customer_id = source_id;
    END IF;

    -- Customer Files
    -- (Assuming a table exists or columns in storage - usually linked by customer_id)
    -- If there's an activity_files table:
    -- UPDATE activity_files SET ...

    -- 4. Delete the source customer
    DELETE FROM customers WHERE id = source_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
