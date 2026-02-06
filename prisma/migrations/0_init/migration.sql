[dotenv@17.2.3] injecting env (4) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "theme" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "focusAreas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "YearPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "yearPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "targetDate" TIMESTAMP(3),
    "strategies" TEXT[],
    "kpis" TEXT[],
    "risks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyStep" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "goalId" TEXT,
    "keyStepId" TEXT,
    "dayPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterPlan" (
    "id" TEXT NOT NULL,
    "yearPlanId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "theme" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterObjective" (
    "id" TEXT NOT NULL,
    "quarterPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterFocus" (
    "id" TEXT NOT NULL,
    "quarterPlanId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterFocus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthPlan" (
    "id" TEXT NOT NULL,
    "quarterPlanId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "objectives" TEXT[],
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "energyRating" DOUBLE PRECISION,
    "rating" INTEGER,
    "reviewNotes" TEXT,
    "theme" TEXT,

    CONSTRAINT "MonthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthFocus" (
    "id" TEXT NOT NULL,
    "monthPlanId" TEXT NOT NULL,
    "quarterFocusId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthFocus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekPlan" (
    "id" TEXT NOT NULL,
    "monthPlanId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "topOutcomes" TEXT[],
    "plannedClientHours" DOUBLE PRECISION,
    "plannedPersonalHours" DOUBLE PRECISION,
    "keyWins" TEXT[],
    "challenges" TEXT[],
    "lessonsLearned" TEXT[],
    "rating" INTEGER,
    "reviewNotes" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WeekPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekFocus" (
    "id" TEXT NOT NULL,
    "weekPlanId" TEXT NOT NULL,
    "monthFocusId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekFocus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "weekPlanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "topPriorities" TEXT[],
    "morningEnergy" DOUBLE PRECISION,
    "afternoonEnergy" DOUBLE PRECISION,
    "eveningEnergy" DOUBLE PRECISION,
    "dailyWin" TEXT,
    "gratitude" TEXT[],
    "tomorrowPrep" TEXT[],
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayFocus" (
    "id" TEXT NOT NULL,
    "dayPlanId" TEXT NOT NULL,
    "weekFocusId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayFocus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "dayPlanId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "actualDuration" INTEGER,
    "energyBefore" DOUBLE PRECISION,
    "energyAfter" DOUBLE PRECISION,
    "focusQuality" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "clientId" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DOUBLE PRECISION,
    "budgetHours" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION,
    "actualHoursSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "goalId" TEXT,
    "parentProjectId" TEXT,
    "priority" TEXT NOT NULL,
    "tags" TEXT[],
    "color" TEXT DEFAULT '#000000',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "icon" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "goalId" TEXT,
    "keyStepId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER NOT NULL DEFAULT 0,
    "timerRunning" BOOLEAN NOT NULL DEFAULT false,
    "currentTimerStart" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tags" TEXT[],
    "parentTaskId" TEXT,
    "dependsOn" TEXT[],
    "blocks" TEXT[],
    "energyRequired" DOUBLE PRECISION,
    "isAdHoc" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingId" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "focusQuality" DOUBLE PRECISION,
    "energyBefore" DOUBLE PRECISION,
    "energyAfter" DOUBLE PRECISION,
    "distractions" INTEGER NOT NULL DEFAULT 0,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "primaryContact" JSONB,
    "additionalContacts" JSONB[],
    "industry" TEXT,
    "website" TEXT,
    "timezone" TEXT,
    "relationshipHealth" DOUBLE PRECISION,
    "lastContactedAt" TIMESTAMP(3),
    "preferredCommunication" TEXT,
    "defaultHourlyRate" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastInteractionAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "from" TEXT,
    "to" TEXT[],
    "cc" TEXT[],
    "attachments" JSONB[],
    "meetingDate" TIMESTAMP(3),
    "meetingDuration" INTEGER,
    "attendees" TEXT[],
    "meetingNotes" TEXT,
    "sentiment" TEXT,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'meeting',
    "userId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "organizer" TEXT NOT NULL DEFAULT 'me',
    "requiredAttendees" TEXT[],
    "optionalAttendees" TEXT[],
    "location" TEXT,
    "meetingLink" TEXT,
    "agenda" TEXT,
    "meetingNotes" TEXT,
    "actionItems" JSONB[],
    "decisions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellBeingEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "morningEnergy" DOUBLE PRECISION,
    "afternoonEnergy" DOUBLE PRECISION,
    "eveningEnergy" DOUBLE PRECISION,
    "averageEnergy" DOUBLE PRECISION,
    "exerciseMinutes" INTEGER NOT NULL DEFAULT 0,
    "exerciseType" TEXT,
    "readingMinutes" INTEGER NOT NULL DEFAULT 0,
    "learningMinutes" INTEGER NOT NULL DEFAULT 0,
    "meditationMinutes" INTEGER NOT NULL DEFAULT 0,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" DOUBLE PRECISION,
    "morningJournal" TEXT,
    "eveningReflection" TEXT,
    "gratitude" TEXT[],
    "dailyWin" TEXT,
    "mood" DOUBLE PRECISION,
    "stressLevel" DOUBLE PRECISION,
    "focusQuality" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellBeingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "transcription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inbox',
    "convertedToTaskId" TEXT,
    "convertedToNoteId" TEXT,
    "suggestedProject" TEXT,
    "suggestedDueDate" TIMESTAMP(3),
    "suggestedPriority" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "audioFileUrl" TEXT NOT NULL,
    "waveformData" JSONB,
    "transcription" TEXT,
    "speakers" JSONB[],
    "timestamps" JSONB[],
    "summary" TEXT,
    "keyPoints" TEXT[],
    "actionItems" JSONB[],
    "projectId" TEXT,
    "tags" TEXT[],
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "clientId" TEXT,
    "meetingId" TEXT,
    "type" TEXT NOT NULL,
    "reminders" JSONB[],
    "color" TEXT,
    "location" TEXT,
    "attendees" TEXT[],
    "externalCalendarId" TEXT,
    "externalEventId" TEXT,
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "YearPlan_userId_idx" ON "YearPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "YearPlan_userId_year_key" ON "YearPlan"("userId", "year");

-- CreateIndex
CREATE INDEX "Goal_yearPlanId_idx" ON "Goal"("yearPlanId");

-- CreateIndex
CREATE INDEX "Milestone_goalId_idx" ON "Milestone"("goalId");

-- CreateIndex
CREATE INDEX "KeyStep_goalId_idx" ON "KeyStep"("goalId");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_goalId_idx" ON "Note"("goalId");

-- CreateIndex
CREATE INDEX "Note_keyStepId_idx" ON "Note"("keyStepId");

-- CreateIndex
CREATE INDEX "Note_dayPlanId_idx" ON "Note"("dayPlanId");

-- CreateIndex
CREATE INDEX "QuarterPlan_yearPlanId_idx" ON "QuarterPlan"("yearPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterPlan_yearPlanId_quarter_key" ON "QuarterPlan"("yearPlanId", "quarter");

-- CreateIndex
CREATE INDEX "QuarterObjective_quarterPlanId_idx" ON "QuarterObjective"("quarterPlanId");

-- CreateIndex
CREATE INDEX "QuarterFocus_quarterPlanId_idx" ON "QuarterFocus"("quarterPlanId");

-- CreateIndex
CREATE INDEX "QuarterFocus_goalId_idx" ON "QuarterFocus"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterFocus_quarterPlanId_goalId_key" ON "QuarterFocus"("quarterPlanId", "goalId");

-- CreateIndex
CREATE INDEX "MonthPlan_quarterPlanId_idx" ON "MonthPlan"("quarterPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthPlan_quarterPlanId_month_key" ON "MonthPlan"("quarterPlanId", "month");

-- CreateIndex
CREATE INDEX "MonthFocus_monthPlanId_idx" ON "MonthFocus"("monthPlanId");

-- CreateIndex
CREATE INDEX "MonthFocus_quarterFocusId_idx" ON "MonthFocus"("quarterFocusId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthFocus_monthPlanId_quarterFocusId_key" ON "MonthFocus"("monthPlanId", "quarterFocusId");

-- CreateIndex
CREATE INDEX "WeekPlan_userId_startDate_endDate_idx" ON "WeekPlan"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "WeekFocus_weekPlanId_idx" ON "WeekFocus"("weekPlanId");

-- CreateIndex
CREATE INDEX "WeekFocus_monthFocusId_idx" ON "WeekFocus"("monthFocusId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekFocus_weekPlanId_monthFocusId_key" ON "WeekFocus"("weekPlanId", "monthFocusId");

-- CreateIndex
CREATE INDEX "DayPlan_userId_date_idx" ON "DayPlan"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_userId_date_key" ON "DayPlan"("userId", "date");

-- CreateIndex
CREATE INDEX "DayFocus_dayPlanId_idx" ON "DayFocus"("dayPlanId");

-- CreateIndex
CREATE INDEX "DayFocus_weekFocusId_idx" ON "DayFocus"("weekFocusId");

-- CreateIndex
CREATE UNIQUE INDEX "DayFocus_dayPlanId_weekFocusId_key" ON "DayFocus"("dayPlanId", "weekFocusId");

-- CreateIndex
CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");

-- CreateIndex
CREATE INDEX "Project_userId_archivedAt_idx" ON "Project"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_scheduledDate_idx" ON "Task"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "Task_userId_timerRunning_idx" ON "Task"("userId", "timerRunning");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_goalId_idx" ON "Task"("goalId");

-- CreateIndex
CREATE INDEX "Task_keyStepId_idx" ON "Task"("keyStepId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startTime_idx" ON "TimeEntry"("userId", "startTime");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_billable_idx" ON "TimeEntry"("userId", "billable");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "WellBeingEntry_userId_date_idx" ON "WellBeingEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WellBeingEntry_userId_date_key" ON "WellBeingEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "YearPlan" ADD CONSTRAINT "YearPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_yearPlanId_fkey" FOREIGN KEY ("yearPlanId") REFERENCES "YearPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyStep" ADD CONSTRAINT "KeyStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_keyStepId_fkey" FOREIGN KEY ("keyStepId") REFERENCES "KeyStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterPlan" ADD CONSTRAINT "QuarterPlan_yearPlanId_fkey" FOREIGN KEY ("yearPlanId") REFERENCES "YearPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterObjective" ADD CONSTRAINT "QuarterObjective_quarterPlanId_fkey" FOREIGN KEY ("quarterPlanId") REFERENCES "QuarterPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterFocus" ADD CONSTRAINT "QuarterFocus_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterFocus" ADD CONSTRAINT "QuarterFocus_quarterPlanId_fkey" FOREIGN KEY ("quarterPlanId") REFERENCES "QuarterPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthPlan" ADD CONSTRAINT "MonthPlan_quarterPlanId_fkey" FOREIGN KEY ("quarterPlanId") REFERENCES "QuarterPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthFocus" ADD CONSTRAINT "MonthFocus_quarterFocusId_fkey" FOREIGN KEY ("quarterFocusId") REFERENCES "QuarterFocus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthFocus" ADD CONSTRAINT "MonthFocus_monthPlanId_fkey" FOREIGN KEY ("monthPlanId") REFERENCES "MonthPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekPlan" ADD CONSTRAINT "WeekPlan_monthPlanId_fkey" FOREIGN KEY ("monthPlanId") REFERENCES "MonthPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekPlan" ADD CONSTRAINT "WeekPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekFocus" ADD CONSTRAINT "WeekFocus_monthFocusId_fkey" FOREIGN KEY ("monthFocusId") REFERENCES "MonthFocus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekFocus" ADD CONSTRAINT "WeekFocus_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "WeekPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "WeekPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayFocus" ADD CONSTRAINT "DayFocus_weekFocusId_fkey" FOREIGN KEY ("weekFocusId") REFERENCES "WeekFocus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayFocus" ADD CONSTRAINT "DayFocus_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_keyStepId_fkey" FOREIGN KEY ("keyStepId") REFERENCES "KeyStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellBeingEntry" ADD CONSTRAINT "WellBeingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

