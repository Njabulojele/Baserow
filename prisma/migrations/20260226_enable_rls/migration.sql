-- Create a function to set the current organization ID in the local transaction state
CREATE OR REPLACE FUNCTION set_current_organization(org_id TEXT) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', org_id, true);
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Project') 
     AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Project' AND column_name = 'organizationId') THEN
    ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS tenant_isolation_policy ON "Project";
    CREATE POLICY tenant_isolation_policy ON "Project"
    USING (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    )
    WITH CHECK (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    );
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Client')
     AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'organizationId') THEN
    ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS tenant_isolation_policy ON "Client";
    CREATE POLICY tenant_isolation_policy ON "Client"
    USING (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    )
    WITH CHECK (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    );
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'CanvasBoard')
     AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'CanvasBoard' AND column_name = 'organizationId') THEN
    ALTER TABLE "CanvasBoard" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS tenant_isolation_policy ON "CanvasBoard";
    CREATE POLICY tenant_isolation_policy ON "CanvasBoard"
    USING (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    )
    WITH CHECK (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    );
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AuditLog')
     AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'organizationId') THEN
    ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS tenant_isolation_policy ON "AuditLog";
    CREATE POLICY tenant_isolation_policy ON "AuditLog"
    USING (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    )
    WITH CHECK (
      "organizationId" = current_setting('app.current_tenant', true) 
      OR "organizationId" IS NULL
    );
  END IF;
END $$;
