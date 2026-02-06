import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { ResearchScope, ResearchStatus, SearchMethod } from "@prisma/client";
import { GeminiClient } from "@/lib/gemini-client";
import { getLLMClientWithFallback } from "@/lib/llm-provider";
import { encryptApiKey, validateGeminiApiKey } from "@/lib/encryption";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";

export const researchRouter = router({
  // Create new research
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        originalPrompt: z.string().min(10),
        scope: z.nativeEnum(ResearchScope),
        searchMethod: z
          .nativeEnum(SearchMethod)
          .optional()
          .default(SearchMethod.GEMINI_GROUNDING),
        goalId: z.string().optional(),
        geminiApiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Validate that at least one LLM key is available (Gemini or Groq)
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { geminiApiKey: true, groqApiKey: true },
      });

      const hasGemini = !!user?.geminiApiKey || !!input.geminiApiKey;
      const hasGroq = !!user?.groqApiKey;

      if (!hasGemini && !hasGroq) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No LLM API key found. Please configure Gemini or Groq in Settings.",
        });
      }

      // If user provides a new Gemini key during creation, save it
      if (input.geminiApiKey) {
        if (!validateGeminiApiKey(input.geminiApiKey)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Gemini API key format",
          });
        }
        const encryptedKey = encryptApiKey(input.geminiApiKey);
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { geminiApiKey: encryptedKey },
        });
      }

      // Create research record
      const research = await ctx.prisma.research.create({
        data: {
          userId,
          title: input.title,
          originalPrompt: input.originalPrompt,
          refinedPrompt: input.originalPrompt, // Initial state
          scope: input.scope,
          searchMethod: input.searchMethod,
          status: ResearchStatus.PENDING,
          goalId: input.goalId,
        },
      });

      return research;
    }),

  // Refine research prompt using Gemini
  refinePrompt: protectedProcedure
    .input(
      z.object({
        researchId: z.string(),
        originalPrompt: z.string(),
        scope: z.nativeEnum(ResearchScope),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          geminiApiKey: true,
          geminiModel: true,
          groqApiKey: true,
          llmProvider: true,
        },
      });

      if (!user?.geminiApiKey && !user?.groqApiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No LLM API keys found",
        });
      }

      const { client: llmClient } = await getLLMClientWithFallback(
        (user.llmProvider as any) || "GEMINI",
        user.geminiApiKey || "",
        "GROQ",
        user.groqApiKey || "",
        user.geminiModel,
      );

      const refinedPrompt = await llmClient.refinePrompt(input.originalPrompt);

      // Update research with refined prompt
      await ctx.prisma.research.update({
        where: { id: input.researchId },
        data: { refinedPrompt },
      });

      return { refinedPrompt };
    }),

  // Start research execution (triggers Inngest)
  startResearch: protectedProcedure
    .input(
      z.object({
        researchId: z.string(),
        retryOptions: z
          .object({
            skipSearch: z.boolean().optional(),
            provider: z.string().optional(),
            model: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findUnique({
        where: { id: input.researchId },
      });

      if (!research) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research not found",
        });
      }

      if (research.userId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Update status
      await ctx.prisma.research.update({
        where: { id: input.researchId },
        data: {
          status: ResearchStatus.IN_PROGRESS,
          progress: input.retryOptions?.skipSearch ? 30 : 5, // Jump ahead if skipping search
        },
      });

      // Trigger Inngest background job
      await inngest.send({
        name: "research/initiated",
        data: {
          researchId: input.researchId,
          userId: ctx.userId,
          retryOptions: input.retryOptions,
        },
      });

      return { success: true };
    }),

  // Cancel ongoing research
  cancelResearch: protectedProcedure
    .input(z.object({ researchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findUnique({
        where: { id: input.researchId },
      });

      if (!research) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research not found",
        });
      }

      if (research.userId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Update status to CANCELLED
      await ctx.prisma.research.update({
        where: { id: input.researchId },
        data: {
          status: ResearchStatus.CANCELLED,
          errorMessage: "Cancelled by user",
        },
      });

      // Note: Inngest job cancellation happens via their dashboard
      // or we could use inngest.cancel() if we stored the run ID

      return { success: true };
    }),

  // List all research for user
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ResearchStatus).optional(),
        goalId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.research.findMany({
        where: {
          userId: ctx.userId,
          ...(input.status && { status: input.status }),
          ...(input.goalId && { goalId: input.goalId }),
        },
        include: {
          goal: { select: { title: true } },
          _count: {
            select: {
              sources: true,
              insights: true,
              actionItems: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get single research with all details
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findUnique({
        where: { id: input.id },
        include: {
          goal: true,
          sources: { orderBy: { scrapedAt: "desc" } },
          insights: { orderBy: { order: "asc" } },
          actionItems: {
            include: {
              convertedToTask: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          leadData: {
            include: {
              leads: { take: 100 },
            },
          },
        },
      });

      if (!research) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research not found",
        });
      }

      if (research.userId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return research;
    }),

  // Convert action item to task
  convertActionToTask: protectedProcedure
    .input(
      z.object({
        actionItemId: z.string(),
        projectId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actionItem = await ctx.prisma.actionItem.findUnique({
        where: { id: input.actionItemId },
        include: { research: true },
      });

      if (!actionItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action item not found",
        });
      }

      if (actionItem.research.userId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (actionItem.convertedToTaskId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Action item already converted",
        });
      }

      // Create task
      const task = await ctx.prisma.task.create({
        data: {
          userId: ctx.userId,
          title: actionItem.description,
          description: `Generated from research: ${actionItem.research.title}`,
          priority:
            actionItem.priority === "HIGH"
              ? "high"
              : actionItem.priority === "LOW"
                ? "low"
                : "medium",
          type: "task",
          status: "not_started",
          projectId: input.projectId,
        },
      });

      // Update action item
      await ctx.prisma.actionItem.update({
        where: { id: input.actionItemId },
        data: {
          convertedToTaskId: task.id,
          convertedAt: new Date(),
        },
      });

      return task;
    }),

  // Generate leads (now triggers Inngest background job)
  generateLeads: protectedProcedure
    .input(z.object({ researchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findUnique({
        where: { id: input.researchId },
        include: { leadData: true },
      });

      if (!research) throw new TRPCError({ code: "NOT_FOUND" });
      if (research.userId !== ctx.userId)
        throw new TRPCError({ code: "UNAUTHORIZED" });

      // Trigger Inngest event for lead generation
      await inngest.send({
        name: "research/generate-leads-requested",
        data: {
          researchId: input.researchId,
          userId: ctx.userId,
        },
      });

      return {
        success: true,
        message: "Lead generation started in background",
      };
    }),

  // Delete research
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findUnique({
        where: { id: input.id },
      });

      if (!research) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research not found",
        });
      }

      if (research.userId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await ctx.prisma.research.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
