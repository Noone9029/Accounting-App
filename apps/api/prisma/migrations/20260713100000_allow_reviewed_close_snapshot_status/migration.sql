BEGIN;

CREATE OR REPLACE FUNCTION "prevent_accounting_close_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'AccountingCloseReadinessSnapshot'
    AND TG_OP = 'UPDATE'
    AND OLD.status = 'DRAFT'
    AND NEW.status = 'REVIEWED'
    AND to_jsonb(NEW) - 'status' = to_jsonb(OLD) - 'status'
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Accounting close readiness snapshots are immutable.';
END;
$$ LANGUAGE plpgsql;

COMMIT;
