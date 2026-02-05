import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { encryptApiKey } from "@/lib/encryption";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const settingsRouter = router({
  // Get user settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        name: true,
        email: true,
        geminiApiKey: true,
        geminiModel: true,
        groqApiKey: true,
        llmProvider: true,
        serperApiKey: true,
        timezone: true,
        researchLimit: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return {
      ...user,
      hasGeminiKey: !!user.geminiApiKey,
      geminiApiKey: user.geminiApiKey ? "********" : null,
      geminiModel: user.geminiModel,
      hasGroqKey: !!user.groqApiKey,
      groqApiKey: user.groqApiKey ? "********" : null,
      llmProvider: user.llmProvider,
      hasSerperKey: !!user.serperApiKey,
      serperApiKey: user.serperApiKey ? "********" : null,
    };
  }),

  // Get available models
  getAvailableModels: protectedProcedure.query(async () => {
    return [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Recommended)" },
      {
        id: "gemini-1.5-pro-latest",
        name: "Gemini 1.5 Pro (Better Reasoning)",
      },
      { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b-latest", name: "Gemini 1.5 Flash 8B (Fast)" },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro (Best Reasoning)",
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash (Best Reasoning)",
      },
    ];
  }),

  // Update settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        timezone: z.string().optional(),
        geminiApiKey: z.string().optional(),
        geminiModel: z.string().optional(),
        serperApiKey: z.string().optional(),
        groqApiKey: z.string().optional(),
        llmProvider: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: any = {};

      if (input.name) data.name = input.name;
      if (input.timezone) data.timezone = input.timezone;
      if (input.geminiModel) data.geminiModel = input.geminiModel;
      if (input.llmProvider) data.llmProvider = input.llmProvider;

      // Only update API key if provided and not empty
      if (input.geminiApiKey && input.geminiApiKey.trim() !== "") {
        // Validate key against Gemini API before saving
        try {
          const genAI = new GoogleGenerativeAI(input.geminiApiKey);
          // Use 2.0-flash for validation as it's the current stable standard
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          await model.generateContent("test");
        } catch (error: any) {
          console.error("Gemini Key Validation Failed:", error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Invalid Gemini API key. Please check your key and try again.",
            cause: error,
          });
        }
        data.geminiApiKey = encryptApiKey(input.geminiApiKey);
      }

      // Validate and update Groq key
      if (input.groqApiKey && input.groqApiKey.trim() !== "") {
        try {
          const response = await fetch(
            "https://api.groq.com/openai/v1/models",
            {
              headers: {
                Authorization: `Bearer ${input.groqApiKey}`,
              },
            },
          );

          if (!response.ok) {
            throw new Error("Groq API validation failed");
          }
        } catch (error: any) {
          console.error("Groq Key Validation Failed:", error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Invalid Groq API key. Please check your key and try again.",
            cause: error,
          });
        }
        data.groqApiKey = encryptApiKey(input.groqApiKey);
      }

      // Only update Serper API key if provided and not empty
      if (input.serperApiKey && input.serperApiKey.trim() !== "") {
        data.serperApiKey = encryptApiKey(input.serperApiKey);
      }

      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data,
      });

      return {
        success: true,
        hasGeminiKey: !!updatedUser.geminiApiKey,
        hasGroqKey: !!updatedUser.groqApiKey,
        hasSerperKey: !!updatedUser.serperApiKey,
      };
    }),
});
