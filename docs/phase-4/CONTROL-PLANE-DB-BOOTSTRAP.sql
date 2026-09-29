-- Phase 4 control-plane database-role bootstrap.
-- Run once as a PostgreSQL administrator before applying migration 0012.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_control_plane') THEN
    CREATE ROLE erp_control_plane NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

-- Grant membership to the trusted control-plane application DB role only.
-- Example (replace with the real pre-created login role):
-- GRANT erp_control_plane TO trusted_control_plane_app;
