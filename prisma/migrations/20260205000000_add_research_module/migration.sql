[dotenv@17.2.3] injecting env (4) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
-- CreateEnum
CREATE TYPE "ResearchScope" AS ENUM ('MARKET_ANALYSIS', 'LEAD_GENERATION', 'COMPETITIVE_INTELLIGENCE', 'BUSINESS_STRATEGY', 'INDUSTRY_TRENDS', 'CUSTOMER_INSIGHTS', 'GENERAL_RESEARCH');

-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "researchLimit" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "Research" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" "ResearchScope" NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "originalPrompt" TEXT NOT NULL,
    "refinedPrompt" TEXT NOT NULL,
    "rawData" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "credibility" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "citedInSections" TEXT[],
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchInsight" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "visualData" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "effort" INTEGER NOT NULL DEFAULT 3,
    "convertedToTaskId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadData" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "exportedAt" TIMESTAMP(3),

    CONSTRAINT "LeadData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadDataId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "painPoints" TEXT[],
    "suggestedDM" TEXT NOT NULL,
    "suggestedEmail" TEXT NOT NULL,
    "personalization" JSONB,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Research_userId_status_idx" ON "Research"("userId", "status");

-- CreateIndex
CREATE INDEX "Research_goalId_idx" ON "Research"("goalId");

-- CreateIndex
CREATE INDEX "ResearchSource_researchId_idx" ON "ResearchSource"("researchId");

-- CreateIndex
CREATE INDEX "ResearchInsight_researchId_idx" ON "ResearchInsight"("researchId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionItem_convertedToTaskId_key" ON "ActionItem"("convertedToTaskId");

-- CreateIndex
CREATE INDEX "ActionItem_researchId_idx" ON "ActionItem"("researchId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadData_researchId_key" ON "LeadData"("researchId");

-- CreateIndex
CREATE INDEX "Lead_leadDataId_idx" ON "Lead"("leadDataId");

-- AddForeignKey
ALTER TABLE "Research" ADD CONSTRAINT "Research_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Research" ADD CONSTRAINT "Research_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchInsight" ADD CONSTRAINT "ResearchInsight_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_convertedToTaskId_fkey" FOREIGN KEY ("convertedToTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadData" ADD CONSTRAINT "LeadData_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_leadDataId_fkey" FOREIGN KEY ("leadDataId") REFERENCES "LeadData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

