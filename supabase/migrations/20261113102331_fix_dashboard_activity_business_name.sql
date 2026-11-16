-- Correct the already-deployed activity branch without changing records or grants.
-- Fresh installs use business_name in the original reporting migration as well.
BEGIN;
DO $$
DECLARE report_oid regprocedure; definition text;
BEGIN
 report_oid:=pg_catalog.to_regprocedure('public.admin_dashboard_section(text,timestamptz,timestamptz,timestamptz,text,text,integer)');
 IF report_oid IS NULL THEN
   RAISE EXCEPTION 'Apply 20261113094113_admin_dashboard_reporting.sql before this correction';
 END IF;
 definition:=pg_catalog.pg_get_functiondef(report_oid);
 IF pg_catalog.strpos(definition,'company_name AS name')>0 THEN
   EXECUTE pg_catalog.replace(definition,'company_name AS name','business_name AS name');
 ELSIF pg_catalog.strpos(definition,'business_name AS name')=0 THEN
   RAISE EXCEPTION 'Unexpected dashboard function definition; review the activity branch before applying';
 END IF;
END;
$$;
COMMIT;
