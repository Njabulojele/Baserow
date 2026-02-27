import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { withTenant } from "../../lib/prisma";

export const searchRouter = router({
  searchAll: protectedProcedure
    .input(z.object({ query: z.string().min(2), organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const q = input.query;

      // Ensure the user restricts search to the specific tenant
      return withTenant(input.organizationId, async (prisma) => {
        // Run specific queries in parallel
        const [projects, tasks, clients, boards, leads] = await Promise.all([
          prisma.project.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: { id: true, name: true, status: true },
          }),
          prisma.task.findMany({
            where: {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: { id: true, title: true, status: true, projectId: true },
          }),
          prisma.client.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { companyName: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: { id: true, name: true, companyName: true },
          }),
          prisma.canvasBoard.findMany({
            where: {
              OR: [{ name: { contains: q, mode: "insensitive" } }],
            },
            take: 5,
            select: { id: true, name: true, type: true },
          }),
          prisma.crmLead.findMany({
            where: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { companyName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          }),
        ]);

        // Map results into a unified schema for the Command Palette
        const unifiedResults = [
          ...projects.map((p) => ({
            id: `proj-${p.id}`,
            type: "Project",
            title: p.name,
            subtitle: `Status: ${p.status}`,
            url: `/projects/${p.id}`,
          })),
          ...tasks.map((t) => ({
            id: `task-${t.id}`,
            type: "Task",
            title: t.title,
            subtitle: `Status: ${t.status}`,
            url: t.projectId ? `/projects/${t.projectId}` : "/tasks",
          })),
          ...clients.map((c) => ({
            id: `client-${c.id}`,
            type: "Client",
            title: c.name,
            subtitle: c.companyName || "No company",
            url: `/clients/${c.id}`,
          })),
          ...boards.map((b) => ({
            id: `board-${b.id}`,
            type: "CanvasBoard",
            title: b.name,
            subtitle: b.type,
            url: `/canvas?board=${b.id}`,
          })),
          ...leads.map((l) => ({
            id: `lead-${l.id}`,
            type: "CRMLead",
            title: `${l.firstName} ${l.lastName}`,
            subtitle: l.companyName,
            url: `/crm/leads`,
          })),
        ];

        return unifiedResults;
      });
    }),
});
