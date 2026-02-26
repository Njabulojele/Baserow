const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$executeRaw`
      CREATE POLICY tenant_isolation_policy ON "Project"
      USING (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      )
      WITH CHECK (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      );
    `;
    console.log("Applied Project RLS Policy");
  } catch (e) { console.error("Project policy failed, maybe already exists?", e.message); }
  
  try {
    await prisma.$executeRaw`
      CREATE POLICY tenant_isolation_policy ON "Client"
      USING (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      )
      WITH CHECK (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      );
    `;
    console.log("Applied Client RLS Policy");
  } catch (e) { console.error("Client policy failed, maybe already exists?", e.message); }

  try {
    await prisma.$executeRaw`
      CREATE POLICY tenant_isolation_policy ON "CanvasBoard"
      USING (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      )
      WITH CHECK (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      );
    `;
    console.log("Applied CanvasBoard RLS Policy");
  } catch (e) { console.error("CanvasBoard policy failed, maybe already exists?", e.message); }

  try {
    await prisma.$executeRaw`
      CREATE POLICY tenant_isolation_policy ON "AuditLog"
      USING (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      )
      WITH CHECK (
        "organizationId" = current_setting('app.current_tenant', true) 
        OR "organizationId" IS NULL
      );
    `;
    console.log("Applied AuditLog RLS Policy");
  } catch (e) { console.error("AuditLog policy failed, maybe already exists?", e.message); }

  try {
      await prisma.$executeRaw`ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;`;
      await prisma.$executeRaw`ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;`;
      await prisma.$executeRaw`ALTER TABLE "CanvasBoard" ENABLE ROW LEVEL SECURITY;`;
      await prisma.$executeRaw`ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;`;
      console.log("Enabled RLS on tables");
  } catch (e) { console.error("Enable RLS failed", e.message); }
  
  await prisma.$disconnect();
}

test();
