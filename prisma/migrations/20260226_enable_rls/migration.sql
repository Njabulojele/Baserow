-- Create a function to set the current organization ID in the local transaction state
CREATE OR REPLACE FUNCTION set_current_organization(org_id TEXT) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', org_id, true);
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on tables that belong to an organization
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CanvasBoard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Project RLS Policies
-- Allow reading/writing if the project's organizationId matches the current tenant, OR if organizationId is null (personal projects)
CREATE POLICY tenant_isolation_policy ON "Project"
USING (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
)
WITH CHECK (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
);

-- Client RLS Policies
CREATE POLICY tenant_isolation_policy ON "Client"
USING (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
)
WITH CHECK (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
);

-- CanvasBoard RLS Policies
CREATE POLICY tenant_isolation_policy ON "CanvasBoard"
USING (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
)
WITH CHECK (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
);

-- AuditLog RLS Policies
CREATE POLICY tenant_isolation_policy ON "AuditLog"
USING (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
)
WITH CHECK (
  "organizationId" = current_setting('app.current_tenant', true) 
  OR "organizationId" IS NULL
);

-- Note: We only apply this to the core top-level organizational entities for Phase 1. 
-- Entities like 'Task' or 'Deal' that trace their organization permissions through their parent Project/Client 
-- are indirectly protected by the application logic, but establishing the boundary on the parent tables is the critical first step.
