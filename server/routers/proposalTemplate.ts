import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const proposalTemplateRouter = router({
  getTemplates: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.proposalTemplate.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.category ? { category: input.category } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        content: z.string().min(1),
        variables: z.array(z.string()).default([]),
        category: z
          .enum(["general", "web_design", "marketing", "saas"])
          .default("general"),
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.proposalTemplate.create({
        data: { ...input, userId: ctx.userId },
      });
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        variables: z.array(z.string()).optional(),
        category: z
          .enum(["general", "web_design", "marketing", "saas"])
          .optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.proposalTemplate.update({ where: { id }, data });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.proposalTemplate.delete({ where: { id: input.id } });
    }),

  generateProposal: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        variables: z.record(z.string()), // e.g. { clientName: "Acme Corp", projectScope: "..." }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.proposalTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });

      // Replace all {{variable}} placeholders
      let rendered = template.content;
      for (const [key, value] of Object.entries(input.variables)) {
        rendered = rendered.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          value,
        );
      }

      // Add auto-generated fields
      const today = new Date().toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      rendered = rendered.replace(/\{\{date\}\}/g, today);
      rendered = rendered.replace(
        /\{\{companyName\}\}/g,
        "Open Infinity Pty Ltd",
      );

      return { rendered, templateName: template.name };
    }),

  seedDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.prisma.proposalTemplate.count({
      where: { userId: ctx.userId },
    });
    if (existing > 0) return { seeded: false };

    await ctx.prisma.proposalTemplate.create({
      data: {
        userId: ctx.userId,
        name: "Web Design & Development Proposal",
        description: "Standard proposal template for web design & dev projects",
        category: "web_design",
        isDefault: true,
        variables: [
          "clientName",
          "clientCompany",
          "projectScope",
          "deliverables",
          "timeline",
          "price",
          "paymentTerms",
        ],
        content: `# Web Design & Development Proposal

**Prepared for:** {{clientName}} — {{clientCompany}}
**Prepared by:** Open Infinity Pty Ltd
**Date:** {{date}}

---

## 1. Executive Summary

Thank you for considering Open Infinity for your web project. We specialise in building modern, high-performance websites that drive leads and convert visitors into customers.

## 2. Project Scope

{{projectScope}}

## 3. Deliverables

{{deliverables}}

## 4. Timeline

{{timeline}}

## 5. Investment

**Total Project Cost:** {{price}}

### Payment Terms
{{paymentTerms}}

## 6. What's Included

- ✅ Custom responsive design (mobile-first)
- ✅ SEO foundation (meta tags, sitemap, schema markup)
- ✅ Google Analytics 4 integration
- ✅ Speed optimisation (Core Web Vitals)
- ✅ 2 rounds of revisions
- ✅ 30-day post-launch support
- ✅ Full source code handover

## 7. Our Process

1. **Discovery call** — Understand your business & goals
2. **Wireframes & design** — Visual mockups for approval
3. **Development** — Clean, modern code
4. **Review & QA** — Testing across devices
5. **Launch** — Go live with support

## 8. Why Open Infinity?

- 🇿🇦 SA-based, we understand the local market
- 💻 Full-stack expertise (Next.js, React, Node.js)
- 📈 Growth-focused design — not just pretty, but profitable
- 🤝 Direct founder communication — no account managers in between

---

**Ready to proceed?** Reply to this email or schedule a call at [calendly link].

Kind regards,
**Open Infinity Pty Ltd**
openinfinity.co.za`,
      },
    });

    return { seeded: true };
  }),
});
