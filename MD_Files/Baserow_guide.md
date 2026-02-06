# Baserow - Ultimate Life & Productivity Management System - Comprehensive Development Prompt

## Project Overview

Design and develop a comprehensive, AI-powered life and productivity management system that enables complete life orchestration through intelligent tracking, planning, and optimization. Baserow replaces memory with systems, transforms goals into actionable plans, and provides real-time insights to maximize productivity, well-being, and achievement.

---

## Vision & Positioning

### Product Philosophy

**"Never Rely on Memory Again. Build Systems That Execute."**

Baserow is not just another todo app or calendar. It's a complete life operating system that:

- Transforms long-term visions into executable daily actions
- Tracks every aspect of productivity and well-being
- Provides intelligent insights and recommendations
- Enforces accountability through visual progress tracking
- Predicts project completion based on actual velocity
- Optimizes energy and prevents burnout
- Integrates client work with personal development seamlessly

### Target User

- **Freelancers & Solo Entrepreneurs**: Managing multiple client projects alongside personal goals
- **Agency Owners**: Balancing client delivery with business growth
- **Knowledge Workers**: Anyone juggling complex projects and personal development
- **High Achievers**: People committed to continuous growth and measurable progress

### Unique Value Propositions

1. **Complete Life Orchestration**: One system for everything - client work, personal projects, health, learning, relationships
2. **Multi-Timeframe Planning**: Seamlessly break down yearly goals into months, weeks, days, and hours
3. **Intelligent Progress Prediction**: AI-powered deadline tracking that tells you if you're on track
4. **Energy Management**: Well-being tracking with burnout prevention recommendations
5. **Client Communication Hub**: Manage emails, meetings, and updates without leaving the app
6. **Visual Motivation**: Beautiful, informative graphs that inspire continued progress
7. **Frictionless Capture**: Voice notes, handwriting, quick captures - never lose an idea
8. **AI-Powered Insights**: Deep research, brainstorming, and strategic planning with integrated AI

---

## Core Feature Set

### 1. HIERARCHICAL GOAL & PROJECT PLANNING

#### Year Planning System

**Purpose**: Define annual vision and major objectives

**Features**:

- Create yearly themes and focus areas (e.g., "2026: Year of Growth")
- Define 3-5 major annual goals with clear success criteria
- Visual annual roadmap showing quarters and major milestones
- Review mechanism to assess year-end progress vs. plan

**Data Model**:

```typescript
YearPlan {
  id: string
  year: number
  theme: string
  vision: string // Long-form description
  focusAreas: string[] // e.g., ["Business Growth", "Health", "Learning"]
  annualGoals: Goal[] // Top-level annual goals
  quarterlyThemes: { Q1: string, Q2: string, Q3: string, Q4: string }
  createdAt: DateTime
  lastReviewedAt: DateTime
}
```

---

#### Quarter Planning

**Purpose**: Break annual goals into quarterly objectives

**Features**:

- 90-day planning cycles
- Quarterly OKRs (Objectives & Key Results)
- Quarter-end review and retrospective
- Quarterly theme setting
- Visual quarter progress dashboard

**Data Model**:

```typescript
QuarterPlan {
  id: string
  yearPlanId: string
  quarter: 1 | 2 | 3 | 4
  objectives: Objective[]
  keyResults: KeyResult[]
  theme: string
  startDate: DateTime
  endDate: DateTime
  reviewNotes: string
  completionRate: number // Calculated
}
```

---

#### Month Planning

**Purpose**: Monthly goal breakdown and sprint planning

**Features**:

- Monthly objectives linked to quarterly goals
- Major project milestones for the month
- Monthly focus areas (max 3-5 priorities)
- End-of-month review system
- Visual monthly calendar with project blocks

**Data Model**:

```typescript
MonthPlan {
  id: string
  quarterPlanId: string
  month: number // 1-12
  year: number
  objectives: string[]
  majorMilestones: Milestone[]
  focusPriorities: Priority[]
  reviewDate: DateTime
  reviewNotes: string
  energyRating: number // 1-10, how energized/burned out
  completionRate: number
}
```

---

#### Week Planning

**Purpose**: Tactical weekly execution planning

**Features**:

- Weekly planning session template (Sunday evening / Monday morning)
- Top 3 outcomes for the week
- Week-at-a-glance calendar view
- Client work vs. personal work allocation
- Energy budget planning (estimate energy required vs. available)
- Weekly review template (Friday evening / Sunday)

**Data Model**:

```typescript
WeekPlan {
  id: string
  monthPlanId: string
  weekNumber: number
  year: number
  startDate: DateTime
  endDate: DateTime
  topOutcomes: string[] // Max 3
  plannedClientHours: number
  plannedPersonalHours: number
  estimatedEnergy: number // 1-10
  actualEnergy: number // 1-10, filled during review
  wins: string[] // Filled during weekly review
  challenges: string[] // Filled during weekly review
  lessonsLearned: string[]
  nextWeekFocus: string[]
}
```

---

#### Day Planning

**Purpose**: Daily execution and task management

**Features**:

- Daily planning ritual (morning)
- Time-blocked schedule
- Top 3 priorities for the day
- Ad-hoc task capture
- Daily review ritual (evening)
- Energy check-ins (morning, afternoon, evening)

**Data Model**:

```typescript
DayPlan {
  id: string
  weekPlanId: string
  date: DateTime
  topPriorities: Task[] // Max 3 MITs (Most Important Tasks)
  timeBlocks: TimeBlock[]
  adHocTasks: Task[]
  morningEnergy: number // 1-10
  afternoonEnergy: number // 1-10
  eveningEnergy: number // 1-10
  dailyWin: string // Biggest accomplishment
  gratitude: string[] // 3 things you're grateful for
  tomorrowPrep: string[] // Setup for tomorrow
  completionRate: number
}
```

---

#### Hour Planning (Time Blocking)

**Purpose**: Granular time allocation and deep work sessions

**Features**:

- Visual time blocking interface (drag-and-drop)
- Deep work vs. shallow work classification
- Focus sessions with Pomodoro-style timers
- Meeting blocks with client info
- Break reminders based on energy patterns
- Time block templates (e.g., "Creative Morning", "Client Afternoon")

**Data Model**:

```typescript
TimeBlock {
  id: string
  dayPlanId: string
  startTime: DateTime
  endTime: DateTime
  duration: number // minutes
  type: "deep_work" | "shallow_work" | "meeting" | "break" | "learning" | "admin"
  task: Task | null
  project: Project | null
  client: Client | null
  actualStartTime: DateTime | null
  actualEndTime: DateTime | null
  actualDuration: number | null
  energyBefore: number | null
  energyAfter: number | null
  focusQuality: number | null // 1-10
  notes: string
}
```

---

### 2. PROJECT & TASK MANAGEMENT

#### Project Hierarchy

**Purpose**: Organize work into logical project structures

**Project Types**:

1. **Client Projects**: Paid client work with deadlines and deliverables
2. **Personal Projects**: Business development, learning, side projects
3. **Life Areas**: Health, relationships, finances, personal growth
4. **Recurring Systems**: Weekly routines, monthly reviews, habits

**Data Model**:

```typescript
Project {
  id: string
  name: string
  description: string
  type: "client" | "personal" | "life_area" | "recurring"
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"

  // Client-specific
  clientId: string | null
  billable: boolean
  hourlyRate: number | null
  budgetHours: number | null

  // Timeline
  startDate: DateTime | null
  deadline: DateTime | null
  estimatedHours: number

  // Tracking
  actualHoursSpent: number // Calculated from time entries
  completionPercentage: number // Manually set or auto-calculated

  // Relationships
  goalId: string | null // Link to annual/quarterly goal
  parentProjectId: string | null // For sub-projects
  milestones: Milestone[]
  tasks: Task[]

  // Metadata
  priority: "critical" | "high" | "medium" | "low"
  tags: string[]
  color: string // For visual identification

  createdAt: DateTime
  updatedAt: DateTime
  completedAt: DateTime | null
  archivedAt: DateTime | null
}
```

---

#### Tasks with Smart Tracking

**Purpose**: Actionable work items with automatic time tracking

**Features**:

- Quick task creation (+ button, keyboard shortcut, voice capture)
- Task states: Not Started → In Progress → Done
- Automatic time tracking when status changes
- Manual time tracking with timer
- Task dependencies and blocking relationships
- Subtask support (infinite nesting)
- Task templates for recurring work

**Data Model**:

```typescript
Task {
  id: string
  title: string
  description: string
  projectId: string | null

  // Status & Progress
  status: "not_started" | "in_progress" | "blocked" | "done" | "cancelled"
  startedAt: DateTime | null // Auto-set when status → in_progress
  completedAt: DateTime | null // Auto-set when status → done

  // Time Tracking
  estimatedMinutes: number | null
  actualMinutes: number // Calculated from time entries
  timerRunning: boolean
  currentTimerStart: DateTime | null

  // Scheduling
  scheduledDate: DateTime | null // When you plan to do it
  dueDate: DateTime | null // Hard deadline

  // Organization
  priority: "critical" | "high" | "medium" | "low"
  type: "deep_work" | "shallow_work" | "admin" | "meeting" | "learning"
  tags: string[]

  // Relationships
  parentTaskId: string | null // For subtasks
  dependsOn: string[] // Task IDs that must be completed first
  blocks: string[] // Task IDs that are waiting on this

  // Energy
  energyRequired: number // 1-10, how much energy this takes

  // Metadata
  createdAt: DateTime
  updatedAt: DateTime
  isAdHoc: boolean // Added during the day, not planned
  isRecurring: boolean
  recurringPattern: string | null // Cron-like pattern
}
```

---

#### Time Entry System

**Purpose**: Automatic and manual time tracking with rich context

**Features**:

- Automatic entries when task status changes
- Manual timer (start/stop)
- Manual entry creation (for forgotten sessions)
- Bulk time entry for retrospective tracking
- Time entry editing and deletion
- Export to CSV/Excel for invoicing

**Data Model**:

```typescript
TimeEntry {
  id: string
  taskId: string | null
  projectId: string | null
  clientId: string | null

  startTime: DateTime
  endTime: DateTime | null // Null if timer still running
  duration: number // minutes, calculated or manual

  type: "automatic" | "manual" | "timer"

  // Context
  description: string
  tags: string[]

  // Quality metrics
  focusQuality: number | null // 1-10, how focused were you
  energyBefore: number | null
  energyAfter: number | null
  distractions: number // Count of interruptions

  // Billing
  billable: boolean
  hourlyRate: number | null
  amount: number // Calculated
  invoiced: boolean

  createdAt: DateTime
  updatedAt: DateTime
}
```

---

### 3. CLIENT MANAGEMENT SYSTEM

#### Client Profiles

**Purpose**: Centralized client information and communication

**Features**:

- Client contact information
- Communication history (emails, meetings, calls)
- Active projects per client
- Billing and invoicing information
- Client preferences and notes
- Relationship health score

**Data Model**:

```typescript
Client {
  id: string
  name: string
  companyName: string | null
  email: string
  phone: string | null

  // Contact details
  primaryContact: {
    name: string
    email: string
    phone: string | null
    role: string
  }
  additionalContacts: Contact[]

  // Business details
  industry: string | null
  website: string | null
  address: Address | null

  // Relationship
  relationshipHealth: number // 1-10
  lastContactedAt: DateTime | null
  preferredCommunication: "email" | "phone" | "slack" | "teams"
  timezone: string

  // Projects & Billing
  activeProjects: Project[]
  totalProjectsCompleted: number
  defaultHourlyRate: number | null
  paymentTerms: string // e.g., "Net 30"
  outstandingBalance: number

  // Notes & Tags
  notes: string
  tags: string[]

  // Metadata
  createdAt: DateTime
  lastInteractionAt: DateTime
  status: "active" | "inactive" | "archived"
}
```

---

#### Client Communication Hub

**Purpose**: Manage all client communications from one place

**Features**:

**Email Integration**:

- Send emails directly from Baserow
- Email templates for common communications
- Thread tracking and history
- Attachment support
- Email scheduling (send later)
- Read receipts

**Meeting Management**:

- Schedule meetings with calendar integration
- Send calendar invites to client emails
- Meeting preparation checklist
- Meeting notes template
- Action items from meetings → tasks
- Meeting recording integration (future)

**Communication Log**:

- Automatic logging of all client interactions
- Manual entry for calls, in-person meetings
- Communication sentiment tracking
- Response time tracking
- Follow-up reminders

**Data Model**:

```typescript
Communication {
  id: string
  clientId: string
  projectId: string | null

  type: "email" | "call" | "meeting" | "message" | "other"
  direction: "inbound" | "outbound"

  subject: string
  content: string
  summary: string | null // AI-generated summary

  // Email specific
  from: string | null
  to: string[]
  cc: string[]
  bcc: string[]
  attachments: Attachment[]

  // Meeting specific
  meetingDate: DateTime | null
  meetingDuration: number | null
  attendees: string[]
  meetingNotes: string | null
  actionItems: Task[]

  // Tracking
  sentiment: "positive" | "neutral" | "negative" | null
  requiresFollowUp: boolean
  followUpDate: DateTime | null

  createdAt: DateTime
  responseTime: number | null // For inbound, how long until we responded
}
```

---

#### Meeting Scheduler

**Purpose**: Seamless meeting scheduling with clients

**Features**:

- Visual calendar availability
- Generate meeting links (Google Meet, Zoom, etc.)
- Send calendar invites to multiple attendees
- Automatic meeting reminders
- Pre-meeting preparation tasks
- Post-meeting follow-up automation
- Meeting templates (discovery call, check-in, sprint review, etc.)

**Data Model**:

```typescript
Meeting {
  id: string
  clientId: string | null
  projectId: string | null

  title: string
  description: string
  type: "discovery" | "check_in" | "sprint_review" | "presentation" | "workshop" | "other"

  // Scheduling
  scheduledAt: DateTime
  duration: number // minutes
  timezone: string

  // Attendees
  organizer: string
  requiredAttendees: string[] // Emails
  optionalAttendees: string[]

  // Location
  location: string | null // Physical location
  meetingLink: string | null // Video call link

  // Preparation
  agenda: string
  preparationTasks: Task[]
  attachments: Attachment[]

  // Notes & Follow-up
  meetingNotes: string | null
  actionItems: Task[]
  decisions: string[]
  nextSteps: string[]

  // Status
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "rescheduled"

  createdAt: DateTime
  updatedAt: DateTime
}
```

---

### 4. DEADLINE & URGENCY MANAGEMENT

#### Intelligent Deadline Tracking

**Purpose**: Predict project completion and surface urgent items

**Features**:

**Visual Urgency Indicators**:

- Color-coded urgency (green → yellow → orange → red → critical red)
- Days until deadline countdown
- Percentage complete vs. time remaining
- "On Track" / "At Risk" / "Behind Schedule" status

**Smart Completion Prediction**:

- Calculate average velocity (tasks/hours per week)
- Estimate remaining work
- Predict completion date based on current pace
- Show "If you continue at this pace, you'll finish on [DATE]"
- Alert when predicted completion > deadline

**Urgency Scoring Algorithm**:

```
urgencyScore = (
  (daysUntilDeadline / totalDaysFromStart) * 0.4 +
  (percentComplete / 100) * 0.3 +
  (clientPriority / 10) * 0.2 +
  (hoursRemainingEstimate / totalHoursEstimate) * 0.1
)

Status:
- Critical: < 3 days & < 80% complete
- At Risk: Predicted completion > deadline
- On Track: Predicted completion <= deadline
- Ahead: > 20% ahead of schedule
```

**Dashboard Widget**:

```typescript
DeadlineWidget {
  upcomingDeadlines: {
    critical: Project[] // Next 3 days
    thisWeek: Project[]
    thisMonth: Project[]
  }
  atRisk: Project[] // Predicted to miss deadline
  needsAttention: Project[] // Low activity recently
}
```

---

#### Urgency Dashboard

**Purpose**: Clear visibility into what needs attention NOW

**Layout**:

**Top Section - CRITICAL**:

- Projects with deadlines < 3 days
- Tasks blocking other tasks
- Client requests awaiting response > 24 hours
- Large, bold, impossible to ignore

**Middle Section - URGENT**:

- Projects with deadlines < 7 days
- At-risk projects (predicted to miss deadline)
- High-priority tasks scheduled for today/tomorrow

**Bottom Section - ATTENTION NEEDED**:

- Projects with no activity in 7+ days
- Tasks scheduled for today but not started
- Weekly/monthly reviews overdue

**Visual Design**:

- Critical: Pulsing red border, large cards
- Urgent: Orange/yellow border
- Attention: Blue border
- Each card shows:
  - Project/task name
  - Client (if applicable)
  - Days until deadline
  - Completion percentage
  - On-track status with prediction
  - Quick action buttons (Start, View, Update)

---

### 5. CALENDAR SYSTEM

#### Multi-View Calendar

**Purpose**: Comprehensive time visualization

**Views**:

1. **Day View**: Hourly time blocks with tasks
2. **Week View**: 7-day overview with time blocks
3. **Month View**: Monthly calendar with project milestones
4. **Quarter View**: 90-day roadmap view
5. **Year View**: Annual planning and quarterly themes

**Features**:

- Drag-and-drop time blocking
- Color-coded by project/client/type
- Time block templates (save and reuse common patterns)
- Calendar sync (Google Calendar, Outlook)
- Event creation with smart suggestions
- Recurring event patterns
- Multi-calendar view (personal, client, meetings)

**Calendar Integration**:

- Two-way sync with Google Calendar
- Import external calendars
- Export Baserow events to external calendars
- Conflict detection
- Meeting preparation reminders

**Data Model**:

```typescript
CalendarEvent {
  id: string
  title: string
  description: string

  // Time
  startTime: DateTime
  endTime: DateTime
  allDay: boolean
  timezone: string

  // Recurrence
  isRecurring: boolean
  recurrenceRule: string | null // RRULE format

  // Relationships
  projectId: string | null
  taskId: string | null
  clientId: string | null
  meetingId: string | null

  // Type
  type: "task" | "meeting" | "time_block" | "reminder" | "personal"

  // Notifications
  reminders: Reminder[]

  // Metadata
  color: string
  location: string | null
  attendees: string[]

  // External sync
  externalCalendarId: string | null
  externalEventId: string | null
  syncStatus: "synced" | "pending" | "error"
}
```

---

### 6. ANALYTICS & INSIGHTS

#### Comprehensive Dashboard

**Purpose**: Visual, motivational insights into productivity and well-being

**Key Metrics**:

**Productivity Metrics**:

- Hours worked (total, by project, by client, by type)
- Tasks completed (daily, weekly, monthly)
- Projects completed
- Average task completion time
- Deep work hours vs. shallow work hours
- Billable hours vs. non-billable hours
- Revenue generated (from time tracking)

**Progress Metrics**:

- Goal completion rate (annual, quarterly, monthly)
- Project completion velocity
- On-time delivery rate
- Average project duration
- Week-over-week progress

**Energy & Well-being Metrics**:

- Energy levels (morning, afternoon, evening averages)
- Energy trends over time
- Burnout risk score
- Days since last break
- Sleep hours (if integrated)
- Exercise frequency (if tracked)
- Reading/learning time

**Client Metrics**:

- Active clients
- Projects per client
- Revenue per client
- Client satisfaction (if rated)
- Average response time to clients
- Meeting frequency per client

---

#### Beautiful, Smooth Graphs

**Purpose**: Visual motivation and insight

**Chart Types & Use Cases**:

**1. Hours Worked - Smooth Line Chart**

- X-axis: Time (days, weeks, months)
- Y-axis: Hours
- Multiple lines: Total, Client Work, Personal Projects, Deep Work
- Smooth bezier curves for aesthetic appeal
- Gradient fill under lines
- Hover tooltips with exact values
- Trend line showing trajectory

**2. Energy Levels - Area Chart**

- X-axis: Time (day/week)
- Y-axis: Energy (1-10)
- Three stacked areas: Morning, Afternoon, Evening
- Color gradient showing high/low energy
- Annotations for notable events (e.g., "Launched major project")
- Burnout warning zone (consistently low energy)

**3. Project Progress - Multi-Bar Chart**

- X-axis: Projects
- Y-axis: Completion %
- Grouped bars: Planned completion vs. Actual completion
- Color-coded by urgency
- Deadline indicators

**4. Task Completion - Heatmap Calendar**

- GitHub-style contribution graph
- Each day colored by tasks completed
- Streak counter
- Click to see day details

**5. Focus Quality - Radial/Polar Chart**

- Compare focus quality across different:
  - Times of day
  - Days of week
  - Project types
  - Before/after breaks
- Find optimal focus patterns

**6. Revenue & Time - Combined Chart**

- Dual Y-axis: Hours (bars) and Revenue (line)
- Show correlation between time invested and earnings
- Monthly/quarterly view
- Forecast projection

**7. Goal Progress - Nested Donut Charts**

- Outer ring: Annual goals
- Middle ring: Quarterly objectives
- Inner ring: Monthly targets
- Interactive: click to drill down

**8. Work-Life Balance - Stacked Bar Chart**

- Daily/weekly view
- Categories: Client work, Personal projects, Learning, Health, Rest
- Target line for ideal balance
- Color-coded for easy scanning

---

#### Chart Library & Styling

**Recommended**: Recharts or Chart.js with custom theming

**Design Principles**:

- Smooth curves (bezier) over sharp angles
- Gradient fills for visual appeal
- Consistent color palette across all charts
- Hover interactions with detailed tooltips
- Responsive design (mobile-optimized)
- Dark mode support
- Export charts as images/PDF
- Animated transitions (entrance and updates)

**Color Palette for Charts**:

```typescript
chartColors = {
  primary: "#6366f1", // Indigo
  success: "#10b981", // Green
  warning: "#f59e0b", // Amber
  danger: "#ef4444", // Red
  info: "#3b82f6", // Blue

  // Multi-line charts
  line1: "#6366f1",
  line2: "#8b5cf6",
  line3: "#ec4899",
  line4: "#f59e0b",
  line5: "#10b981",

  // Gradients
  gradient1: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
  gradient2: "linear-gradient(180deg, #10b981 0%, #3b82f6 100%)",

  // Backgrounds
  gridLines: "rgba(255, 255, 255, 0.1)",
  chartBackground: "rgba(255, 255, 255, 0.02)",
};
```

---

#### Insight Engine (AI-Powered)

**Purpose**: Surface actionable insights automatically

**Automated Insights**:

**Weekly Insights Email/Notification**:

- "You completed 87% of your planned tasks this week! 🎉"
- "Your energy levels were highest on Tuesday mornings - schedule deep work then."
- "Project X is at risk: only 30% complete with 2 weeks until deadline."
- "You've worked 52 hours this week. Consider taking a break."
- "Your focus quality increases 40% when you work in 90-minute blocks."

**Monthly Insights Report**:

- Top achievements
- Areas for improvement
- Productivity patterns discovered
- Goal progress analysis
- Client work breakdown
- Revenue summary
- Comparison to previous month

**Predictive Insights**:

- "Based on your current pace, you'll complete Annual Goal #2 by March (2 months early!)"
- "Client A typically requests revisions on Thursdays - allocate buffer time."
- "Your energy crashes after 3 consecutive deep work sessions - schedule a break."
- "You're most productive on Monday and Wednesday mornings - protect this time."

---

### 7. WELL-BEING & ENERGY MANAGEMENT

#### Energy Tracking System

**Purpose**: Prevent burnout and optimize performance

**Features**:

**Energy Check-ins**:

- Morning: How energized do you feel? (1-10)
- Afternoon: Energy level check-in
- Evening: End-of-day energy assessment
- Track energy alongside hours worked

**Energy Patterns**:

- Visualize energy across:
  - Time of day
  - Days of week
  - After specific activities (meetings, deep work, exercise)
  - Correlation with sleep, exercise, diet (if tracked)

**Burnout Prevention**:

- Calculate burnout risk score based on:
  - Consecutive days worked
  - Hours per week (sustained high hours)
  - Declining energy trend
  - Missed breaks
  - Low focus quality
- Alert when risk is high
- Suggest interventions

**Energy Budget**:

- Estimate energy required for upcoming tasks
- Compare to available energy
- Warn when overcommitted
- Suggest task reprioritization or delegation

---

#### Well-being Routines

**Purpose**: Integrate healthy habits into productivity system

**Features**:

**Morning Routine**:

- Wake-up time tracking
- Morning pages / journaling
- Gratitude practice (3 things)
- Day planning ritual
- Energy assessment
- Intention setting

**Evening Routine**:

- Daily review
  - What went well?
  - What could be improved?
  - Biggest win
  - Lessons learned
- Tomorrow preparation
  - Top 3 priorities for tomorrow
  - Time block critical tasks
  - Set intentions
- Gratitude practice
- Energy assessment
- Screen time cutoff reminder

**Weekly Review**:

- Review accomplishments
- Analyze patterns (energy, productivity, focus)
- Assess goal progress
- Plan next week
- Celebrate wins
- Identify improvements

**Healthy Habits Tracking**:

- Exercise: Type, duration, frequency
- Reading: Books, articles, time spent
- Learning: Courses, tutorials, hours
- Meditation / mindfulness
- Sleep: Hours, quality
- Social connection: Time with friends/family
- Nutrition: Basic tracking (optional)

**Data Model**:

```typescript
WellBeingEntry {
  id: string
  date: DateTime

  // Energy
  morningEnergy: number | null
  afternoonEnergy: number | null
  eveningEnergy: number | null
  averageEnergy: number // Calculated

  // Habits
  exerciseMinutes: number
  exerciseType: string | null
  readingMinutes: number
  learningMinutes: number
  meditationMinutes: number
  sleepHours: number | null
  sleepQuality: number | null // 1-10

  // Journaling
  morningJournal: string | null
  eveningReflection: string | null
  gratitude: string[]
  dailyWin: string | null

  // Mood & Stress
  mood: number // 1-10
  stressLevel: number // 1-10
  focusQuality: number // 1-10

  // Notes
  notes: string | null
}
```

---

#### Rest & Recovery Recommendations

**Purpose**: Intelligent rest suggestions based on data

**Recommendation Engine**:

**Triggers for "Take a Break" suggestions**:

- Worked 6+ consecutive days
- Averaged 50+ hours/week for 3+ weeks
- Energy declining for 5+ consecutive days
- Focus quality < 5/10 for 3+ consecutive days
- High burnout risk score

**Types of Break Suggestions**:

- "Take a day off this week"
- "Schedule a half-day on Friday"
- "Consider a long weekend"
- "Block your calendar for a vacation"
- "Take a 2-hour break this afternoon"
- "End work 2 hours early today"

**Proactive Calendar Blocking**:

- Automatically suggest free days
- Block personal time during high-stress periods
- Protect evenings and weekends
- Enforce minimum hours off between work sessions

---

### 8. PERSONAL PROJECTS & LIFE AREAS

#### Personal Project Management

**Purpose**: Balance client work with personal development

**Personal Project Types**:

1. **Business Development**: Marketing, networking, content creation
2. **Learning**: Courses, reading, skill development
3. **Side Projects**: Passion projects, experiments
4. **Content Creation**: Blog, YouTube, social media
5. **Health & Fitness**: Exercise routines, nutrition goals
6. **Relationships**: Family time, friendships, networking
7. **Finances**: Budgeting, investing, financial planning

**Separate Metrics**:

- Personal project hours tracked separately
- Personal goal completion rates
- Learning hours (e.g., "100 hours of learning in 2026")
- Content produced (blog posts, videos, etc.)
- Books read counter
- Exercise sessions completed

---

#### Life Areas Framework

**Purpose**: Holistic life management beyond work

**8 Life Areas** (wheel of life):

1. **Career & Work**: Client projects, income, professional growth
2. **Learning & Growth**: Skills, knowledge, education
3. **Health & Energy**: Fitness, nutrition, sleep, energy
4. **Relationships**: Family, friends, network, community
5. **Finances**: Income, savings, investments, debt
6. **Recreation & Fun**: Hobbies, travel, entertainment
7. **Environment**: Home, workspace, physical surroundings
8. **Contribution**: Giving back, mentoring, volunteering

**Life Area Dashboard**:

- Wheel of Life visualization (radar chart)
- Rate satisfaction in each area (1-10)
- Set goals for each area
- Track time invested in each
- Balance score (are you neglecting any area?)

**Data Model**:

```typescript
LifeArea {
  id: string
  name: string
  description: string
  satisfactionRating: number // 1-10, updated monthly
  timeInvestedThisWeek: number // hours
  timeInvestedThisMonth: number
  goals: Goal[]
  projects: Project[]
  notes: string
  lastReviewedAt: DateTime
}
```

---

### 9. REVIEWS & REFLECTION SYSTEM

#### Daily Review

**Time**: Evening (5-10 minutes)

**Template**:

```
Daily Review - [Date]

✅ Top 3 Accomplishments:
1.
2.
3.

🎯 Top 3 Priorities Completed:
□ Priority 1
□ Priority 2
□ Priority 3

⚡ Energy Levels:
Morning: [1-10]
Afternoon: [1-10]
Evening: [1-10]

💡 What went well?


🔧 What could be improved?


📚 What did I learn today?


🙏 3 Things I'm Grateful For:
1.
2.
3.

🌟 Biggest Win:


📝 Notes for Tomorrow:


---
Tomorrow's Top 3:
1.
2.
3.
```

---

#### Weekly Review

**Time**: Sunday evening or Friday afternoon (30-45 minutes)

**Template**:

```
Weekly Review - Week [#] of [Year]

📊 WEEKLY METRICS
- Hours Worked: [X] hours
  - Client Work: [X] hours
  - Personal Projects: [X] hours
- Tasks Completed: [X] tasks
- Goals Progress: [X]%
- Average Energy: [X]/10

🎯 GOALS & OUTCOMES
Top 3 Intended Outcomes:
1. [✓/✗]
2. [✓/✗]
3. [✓/✗]

Completion Rate: [X]%

🏆 WINS & ACHIEVEMENTS
Major wins this week:
-
-
-

Projects advanced:
-
-

Skills developed:
-

📈 PROGRESS
Annual Goals Progress:
- Goal 1: [X]% (+[X]% this week)
- Goal 2: [X]% (+[X]% this week)

Quarterly Objectives:
- Objective 1: [X]%
- Objective 2: [X]%

🧠 INSIGHTS & LEARNINGS
What worked well:
-
-

What didn't work:
-
-

Lessons learned:
-
-

Patterns noticed:
-
-

⚡ ENERGY & WELL-BEING
Average energy: [X]/10
Burnout risk: [Low/Medium/High]
Exercise: [X] sessions
Reading: [X] hours
Sleep: Avg [X] hours/night

Self-care notes:
-

🎯 NEXT WEEK PLANNING
Top 3 Outcomes for next week:
1.
2.
3.

Major milestones:
-
-

Time allocation:
- Client work: [X] hours
- Personal projects: [X] hours
- Learning: [X] hours
- Rest: [X] hours

Anticipated challenges:
-

How I'll address them:
-

💭 REFLECTIONS
Overall satisfaction: [X]/10

What I'm grateful for:
-
-

What I'm looking forward to:
-
-

Adjustments needed:
-
-
```

---

#### Monthly Review

**Time**: Last day of month or first day of new month (1-2 hours)

**Template**:

```
Monthly Review - [Month] [Year]

📊 MONTHLY METRICS
- Total Hours: [X]
- Client Revenue: R[X]
- Tasks Completed: [X]
- Projects Completed: [X]
- Books Read: [X]
- Learning Hours: [X]
- Exercise Sessions: [X]

🎯 MONTHLY OBJECTIVES
[List each objective with completion status]
1. [✓/✗]
2. [✓/✗]
3. [✓/✗]

Overall Completion: [X]%

🏆 MAJOR WINS
Projects Shipped:
-
-

Milestones Achieved:
-
-

Skills Developed:
-
-

Personal Bests:
-
-

📊 CLIENT WORK ANALYSIS
Active Clients: [X]
New Clients: [X]
Projects Delivered: [X]
Average Project Value: R[X]
Client Satisfaction: [X]/10

Top Client:
-

Most Profitable Project:
-

📈 GOAL PROGRESS
[For each annual goal, show current %]
Annual Goal 1: [X]% (Target: [X]%)
Annual Goal 2: [X]% (Target: [X]%)

On Track / Behind / Ahead

Adjustments Needed:
-
-

⚡ ENERGY & HEALTH
Average Energy: [X]/10
Burnout Risk: [Low/Medium/High]
Energy Trend: [↑/→/↓]

Health Habits:
- Exercise: [X] sessions (Goal: [Y])
- Reading: [X] hours (Goal: [Y])
- Sleep: Avg [X] hours
- Meditation: [X] sessions

Energy Insights:
-
-

🧠 KEY LEARNINGS
What worked exceptionally well:
1.
2.
3.

What didn't work:
1.
2.
3.

Systems to implement:
-
-

Systems to remove:
-
-

💰 FINANCIAL REVIEW
Income: R[X]
Expenses: R[X]
Profit: R[X]
Savings Rate: [X]%

Financial Goals Progress:
-
-

🎯 NEXT MONTH PLANNING
Theme for Next Month:


Top 3 Objectives:
1.
2.
3.

Major Projects:
-
-

Focus Areas:
-
-

Time Budget:
- Client work: [X] hours
- Personal: [X] hours
- Learning: [X] hours
- Rest: [X] hours

Experiments to Try:
-
-

💭 PERSONAL REFLECTION
Overall Satisfaction: [X]/10
Mood Trend: [↑/→/↓]
Stress Level: [X]/10

What I'm proud of:
-
-

What I'm grateful for:
-
-

What I want more of:
-
-

What I want less of:
-
-

🔮 LOOKING AHEAD
Upcoming Deadlines (Next 3 Months):
-
-

Opportunities on the Horizon:
-
-

Potential Challenges:
-
-

Preparation Needed:
-
-
```

---

#### Quarterly Review

**Time**: End of quarter (2-3 hours)

**Template**:

```
Quarterly Review - Q[#] [Year]

📊 QUARTERLY METRICS
[Complete overview of all metrics]

🎯 QUARTERLY OBJECTIVES (OKRs)
[Review each objective and key result]

📈 ANNUAL GOAL PROGRESS
[Deep dive into goal progress]

🏆 BIGGEST WINS

💡 KEY LEARNINGS

⚡ ENERGY & WELL-BEING ANALYSIS

🔮 NEXT QUARTER PLANNING
Theme:
Objectives:
Major Milestones:
```

---

#### Annual Review

**Time**: End of year (4+ hours)

**Template**:

```
Annual Review - [Year]

🎯 ANNUAL GOALS REVIEW
[Comprehensive review of all goals]

📊 YEAR IN NUMBERS
[All metrics for the entire year]

🏆 TOP 10 WINS OF THE YEAR

💡 TOP 10 LESSONS LEARNED

🔮 NEXT YEAR VISION & PLANNING
```

---

### 10. CAPTURE SYSTEMS (Future AI Integration)

#### Quick Capture Methods

**Purpose**: Never lose an idea, thought, or task

**Capture Types**:

**1. Text Capture**:

- Quick add button (always visible)
- Keyboard shortcut (Cmd/Ctrl + K)
- Smart parsing: "Call John tomorrow at 2pm" → Creates task with due date
- Inbox for processing later

**2. Voice Notes**:

- One-tap recording
- Automatic transcription (Whisper API or similar)
- Speaker identification
- Brainstorming sessions
- Meeting notes via voice
- Daily journaling via voice

**3. Handwritten Notes** (Future):

- iPad/tablet support with Apple Pencil
- OCR for handwriting recognition
- Sketch support
- Diagram creation
- Convert handwriting to typed text

**4. Email Capture**:

- Unique email address (e.g., capture@Baserow.app)
- Email forwarding creates tasks
- Parse email for due dates, projects, priorities

**5. Browser Extension** (Future):

- Capture web pages as tasks/notes
- Save research for projects
- Bookmark with tagging
- Screenshot capture

**Data Model**:

```typescript
Capture {
  id: string
  type: "text" | "voice" | "handwritten" | "email" | "web" | "image"
  content: string // Raw content
  transcription: string | null // For voice/handwriting

  // Metadata
  createdAt: DateTime
  processedAt: DateTime | null

  // Processing
  status: "inbox" | "processed" | "archived"
  convertedToTaskId: string | null
  convertedToNoteId: string | null

  // AI-extracted data
  suggestedProject: string | null
  suggestedDueDate: DateTime | null
  suggestedPriority: string | null
  tags: string[]
}
```

---

#### Voice Brainstorming Sessions

**Purpose**: Capture free-form thinking and ideation

**Features**:

- Start recording with one tap
- Unlimited duration
- Automatic transcription
- Speaker diarization (distinguish between people in conversation)
- Timestamp markers
- Playback at variable speeds
- Export transcripts
- Link to projects or notes
- AI summarization of key points

**Use Cases**:

- Solo brainstorming
- Client calls (with permission)
- Idea generation sessions
- Problem-solving walks
- Meeting notes
- Daily reflections

**Data Model**:

```typescript
VoiceSession {
  id: string
  title: string
  duration: number // seconds
  recordedAt: DateTime

  // Audio
  audioFileUrl: string
  waveformData: number[] // For visualization

  // Transcription
  transcription: string
  speakers: Speaker[] // If multiple people
  timestamps: Timestamp[]

  // AI Processing
  summary: string | null
  keyPoints: string[]
  actionItems: Task[]

  // Relationships
  projectId: string | null
  tags: string[]

  // Status
  processed: boolean
  archivedAt: DateTime | null
}
```

---

### 11. AI-POWERED FEATURES (Future Phase)

#### AI Research Assistant (via MCP)

**Purpose**: Deep research and strategic planning with AI

**Features**:

**Research Sessions**:

- Ask AI to research topics
- Multi-step research plans
- Source aggregation
- Summary generation
- Save research to knowledge base

**Strategic Brainstorming**:

- "Help me plan the next quarter"
- "What's the best approach to [problem]?"
- "Analyze my productivity data and suggest improvements"
- Conversational planning sessions

**Project Planning Assistant**:

- Break down complex projects into tasks
- Estimate time requirements
- Identify dependencies
- Suggest project structure
- Risk identification

**Content Generation**:

- Blog post outlines
- Email templates
- Meeting agendas
- Proposal drafts
- Documentation

**Data Analysis**:

- "Why was I less productive last week?"
- "What patterns do you see in my energy data?"
- "Which clients are most profitable?"
- "Am I on track to hit my annual goals?"

**Implementation**:

- Use Claude MCP servers for research
- Store AI conversations linked to projects
- Export AI insights to tasks/notes
- Train on your historical data for personalized insights

---

#### AI Note-Taking

**Purpose**: Intelligent note organization and retrieval

**Features**:

- Automatic tagging and categorization
- Smart linking between related notes
- Summary generation
- Key point extraction
- Question answering over your notes ("What did I decide about X?")

---

### 12. MOBILE-FIRST DESIGN

#### Design Philosophy

**Priority**: Mobile experience is primary, desktop is enhancement

**Mobile Features**:

**Home Screen**:

- Today's top 3 priorities (large, tappable)
- Quick add button (floating action button)
- Energy check-in prompt
- Time until next event
- Critical deadline warnings

**Quick Actions**:

- Swipe gestures:
  - Swipe right on task: Mark as done
  - Swipe left: Reschedule
  - Long press: Edit
  - Drag: Reorder
- One-tap time tracking:
  - Tap task → Automatically starts timer
  - Tap "Done" → Stops timer, marks complete

**Mobile-Optimized Views**:

- Bottom navigation (thumb-friendly)
- Large touch targets (48x48px minimum)
- Minimal typing required
- Smart defaults
- Voice input everywhere
- Offline mode with sync

**Mobile Widgets** (iOS/Android):

- Today's top priorities
- Current time tracking
- Energy check-in
- Quick capture

**Progressive Web App (PWA)**:

- Install on home screen
- Offline functionality
- Push notifications
- Background sync

---

#### Responsive Breakpoints

```
Mobile: < 640px (primary design)
Tablet: 640px - 1024px
Desktop: 1024px - 1440px
Large Desktop: > 1440px
```

**Mobile-First Components**:

- Collapsible sections
- Bottom sheets for actions
- Swipe gestures
- Pull-to-refresh
- Infinite scroll
- Skeleton loading states

---

### 13. NOTIFICATION & REMINDER SYSTEM

#### Smart Notifications

**Purpose**: Timely reminders without overwhelm

**Notification Types**:

**Time-Based**:

- Task due soon (1 hour, 1 day, 1 week before)
- Meeting starting in 15 minutes
- Time block starting in 5 minutes
- Daily review reminder (evening)
- Weekly review reminder (Sunday/Friday)

**Event-Based**:

- Task status changed by collaborator
- Client sent a message
- Project deadline approaching
- Burnout risk detected
- Weekly goal achievement milestone

**Habit Reminders**:

- Morning routine prompt
- Evening review prompt
- Energy check-in
- Weekly review
- Monthly review

**Smart Scheduling**:

- Learn user's preferred notification times
- Suppress during focus sessions
- Batch non-urgent notifications
- Respect quiet hours

**Notification Preferences**:

- Per-notification-type toggle
- Quiet hours configuration
- Urgent-only mode
- Digest mode (batch into daily summary)

**Data Model**:

```typescript
Notification {
  id: string
  type: "task_due" | "meeting_reminder" | "review_prompt" | "achievement" | "warning"
  title: string
  body: string

  // Scheduling
  scheduledFor: DateTime
  sentAt: DateTime | null

  // Targeting
  userId: string

  // Relationships
  taskId: string | null
  projectId: string | null
  meetingId: string | null

  // Status
  read: boolean
  dismissed: boolean
  actionTaken: boolean

  // Delivery
  channels: ("push" | "email" | "in_app")[]
  priority: "low" | "medium" | "high" | "critical"
}
```

---

### 14. COLLABORATION & SHARING (Future)

#### Share Progress with Stakeholders

**Purpose**: Keep clients/team updated without overhead

**Features**:

- Public project status pages
- Shareable weekly progress reports
- Client-facing dashboards
- Embed progress widgets
- Email progress reports

**Client Portal** (Future):

- Clients can view their project status
- Communication history
- File sharing
- Approval workflows
- Invoice access

---

### 15. INTEGRATIONS

#### Essential Integrations

**Calendar**:

- Google Calendar (two-way sync)
- Outlook Calendar
- Apple Calendar

**Email**:

- Gmail API (send emails, read emails)
- Outlook
- SMTP for custom domains

**File Storage**:

- Google Drive
- Dropbox
- OneDrive
- Local storage

**Time Tracking**:

- Export to Toggl
- Export to Harvest
- CSV export for invoicing

**Accounting**:

- QuickBooks (future)
- Xero (future)
- FreshBooks (future)

**Communication**:

- Slack webhooks (send updates)
- Discord webhooks
- WhatsApp Business API (future)

**AI & Automation**:

- OpenAI API (GPT-4 for insights)
- Anthropic Claude (MCP for research)
- Whisper API (voice transcription)
- ElevenLabs (voice generation - future)

**Analytics**:

- Google Analytics (product analytics)
- Mixpanel (user behavior)
- PostHog (product analytics + session replay)

---

## Technical Architecture

### Technology Stack

**Frontend Framework**: Next.js 14+ (App Router)

- Server-side rendering (SSR)
- React Server Components
- Server Actions for mutations
- Parallel routes for dashboard
- Route interception for modals

**UI Framework**: React 18+

- Concurrent features
- Suspense for data fetching
- Transitions API
- Error boundaries

**Styling**: Tailwind CSS

- Custom design system
- Dark mode support
- Responsive utilities
- Animation utilities

**Component Library**: shadcn/ui

- Accessible components
- Customizable primitives
- Radix UI under the hood

**State Management**:

- React Server State (from Next.js)
- Zustand (client state)
- React Query / TanStack Query (server state caching)

**Form Handling**:

- React Hook Form
- Zod validation schemas
- Type-safe forms

**Charts**: Recharts

- Responsive charts
- Smooth animations
- Custom theming
- Accessible

**Backend**: tRPC

- End-to-end type safety
- No API boilerplate
- Real-time subscriptions
- Batching and caching

**Database**: Neon (Serverless PostgreSQL)

- Serverless, scalable
- Branching for development
- Connection pooling
- Edge-ready

**ORM**: Prisma

- Type-safe database access
- Schema migrations
- Prisma Studio for data management
- Query optimization

**Authentication**: NextAuth.js or Clerk

- Email/password
- OAuth (Google, GitHub)
- Session management
- Role-based access control (future for teams)

**File Storage**: Cloudinary or Vercel Blob

- Image optimization
- Video storage
- Audio file storage
- Transcription storage

**Real-time**: Pusher or Ably

- Real-time updates
- Presence (who's online - future for teams)
- Typing indicators (future for team chat)

**Email**: Resend or SendGrid

- Transactional emails
- Email templates
- Delivery tracking

**Analytics**:

- Vercel Analytics (web vitals)
- PostHog (product analytics)
- Custom event tracking

**AI & ML**:

- OpenAI API (GPT-4, Whisper)
- Anthropic Claude (via MCP)
- Vercel AI SDK (streaming, function calling)

**Deployment**: Vercel

- Automatic CI/CD
- Edge network
- Preview deployments
- Environment variables management

**Monitoring**:

- Sentry (error tracking)
- LogRocket (session replay - optional)
- Vercel logs

---

### Database Schema (Prisma)

**Core Models**:

```prisma
// User & Authentication
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  avatar        String?
  timezone      String    @default("Africa/Johannesburg")

  // Relationships
  yearPlans     YearPlan[]
  projects      Project[]
  tasks         Task[]
  clients       Client[]
  timeEntries   TimeEntry[]
  captures      Capture[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// Planning Hierarchy
model YearPlan {
  id            String    @id @default(cuid())
  userId        String
  year          Int
  theme         String
  vision        String    @db.Text
  focusAreas    String[]

  quarterPlans  QuarterPlan[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model QuarterPlan {
  id            String    @id @default(cuid())
  yearPlanId    String
  quarter       Int       // 1-4
  theme         String
  objectives    String[]

  monthPlans    MonthPlan[]

  startDate     DateTime
  endDate       DateTime

  yearPlan      YearPlan  @relation(fields: [yearPlanId], references: [id], onDelete: Cascade)
}

model MonthPlan {
  id              String    @id @default(cuid())
  quarterPlanId   String
  month           Int       // 1-12
  year            Int
  objectives      String[]

  weekPlans       WeekPlan[]

  completionRate  Float     @default(0)
  energyRating    Float?

  quarterPlan     QuarterPlan @relation(fields: [quarterPlanId], references: [id], onDelete: Cascade)
}

model WeekPlan {
  id                String    @id @default(cuid())
  monthPlanId       String
  weekNumber        Int
  year              Int
  startDate         DateTime
  endDate           DateTime

  topOutcomes       String[]
  plannedClientHours Float?
  plannedPersonalHours Float?

  dayPlans          DayPlan[]

  monthPlan         MonthPlan @relation(fields: [monthPlanId], references: [id], onDelete: Cascade)
}

model DayPlan {
  id              String    @id @default(cuid())
  weekPlanId      String
  date            DateTime  @db.Date

  topPriorities   String[]  // Task IDs

  morningEnergy   Float?
  afternoonEnergy Float?
  eveningEnergy   Float?

  dailyWin        String?
  gratitude       String[]
  tomorrowPrep    String[]

  timeBlocks      TimeBlock[]

  completionRate  Float     @default(0)

  weekPlan        WeekPlan  @relation(fields: [weekPlanId], references: [id], onDelete: Cascade)
}

model TimeBlock {
  id              String    @id @default(cuid())
  dayPlanId       String

  startTime       DateTime
  endTime         DateTime
  duration        Int       // minutes

  type            String    // deep_work, shallow_work, meeting, break, learning, admin

  taskId          String?
  projectId       String?
  clientId        String?

  actualStartTime DateTime?
  actualEndTime   DateTime?
  actualDuration  Int?

  energyBefore    Float?
  energyAfter     Float?
  focusQuality    Float?

  notes           String?   @db.Text

  dayPlan         DayPlan   @relation(fields: [dayPlanId], references: [id], onDelete: Cascade)
  task            Task?     @relation(fields: [taskId], references: [id])
  project         Project?  @relation(fields: [projectId], references: [id])
  client          Client?   @relation(fields: [clientId], references: [id])
}

// Projects & Tasks
model Project {
  id                  String    @id @default(cuid())
  userId              String
  name                String
  description         String?   @db.Text
  type                String    // client, personal, life_area, recurring
  status              String    // planning, active, on_hold, completed, cancelled

  // Client-specific
  clientId            String?
  billable            Boolean   @default(false)
  hourlyRate          Float?
  budgetHours         Float?

  // Timeline
  startDate           DateTime?
  deadline            DateTime?
  estimatedHours      Float?

  // Tracking
  actualHoursSpent    Float     @default(0)
  completionPercentage Float    @default(0)

  // Relationships
  goalId              String?
  parentProjectId     String?

  tasks               Task[]
  timeEntries         TimeEntry[]
  timeBlocks          TimeBlock[]

  // Metadata
  priority            String    // critical, high, medium, low
  tags                String[]
  color               String?

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  completedAt         DateTime?
  archivedAt          DateTime?

  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  client              Client?   @relation(fields: [clientId], references: [id])
}

model Task {
  id                String    @id @default(cuid())
  userId            String
  projectId         String?

  title             String
  description       String?   @db.Text

  status            String    @default("not_started") // not_started, in_progress, blocked, done, cancelled

  startedAt         DateTime?
  completedAt       DateTime?

  // Time tracking
  estimatedMinutes  Int?
  actualMinutes     Int       @default(0)
  timerRunning      Boolean   @default(false)
  currentTimerStart DateTime?

  // Scheduling
  scheduledDate     DateTime?
  dueDate           DateTime?

  // Organization
  priority          String    // critical, high, medium, low
  type              String    // deep_work, shallow_work, admin, meeting, learning
  tags              String[]

  // Relationships
  parentTaskId      String?
  dependsOn         String[]
  blocks            String[]

  // Energy
  energyRequired    Float?    // 1-10

  // Metadata
  isAdHoc           Boolean   @default(false)
  isRecurring       Boolean   @default(false)
  recurringPattern  String?

  timeEntries       TimeEntry[]
  timeBlocks        TimeBlock[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  project           Project?  @relation(fields: [projectId], references: [id])
}

model TimeEntry {
  id              String    @id @default(cuid())
  userId          String
  taskId          String?
  projectId       String?
  clientId        String?

  startTime       DateTime
  endTime         DateTime?
  duration        Int       // minutes

  type            String    // automatic, manual, timer

  description     String?   @db.Text
  tags            String[]

  // Quality metrics
  focusQuality    Float?
  energyBefore    Float?
  energyAfter     Float?
  distractions    Int       @default(0)

  // Billing
  billable        Boolean   @default(false)
  hourlyRate      Float?
  amount          Float     @default(0)
  invoiced        Boolean   @default(false)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  task            Task?     @relation(fields: [taskId], references: [id])
  project         Project?  @relation(fields: [projectId], references: [id])
  client          Client?   @relation(fields: [clientId], references: [id])
}

// Clients & Communication
model Client {
  id                  String    @id @default(cuid())
  userId              String

  name                String
  companyName         String?
  email               String
  phone               String?

  // Contact details
  primaryContact      Json?     // {name, email, phone, role}
  additionalContacts  Json[]    // Array of contacts

  // Business
  industry            String?
  website             String?
  timezone            String?

  // Relationship
  relationshipHealth  Float?    // 1-10
  lastContactedAt     DateTime?
  preferredCommunication String? // email, phone, slack

  // Billing
  defaultHourlyRate   Float?
  paymentTerms        String?
  outstandingBalance  Float     @default(0)

  // Metadata
  notes               String?   @db.Text
  tags                String[]
  status              String    @default("active") // active, inactive, archived

  projects            Project[]
  timeEntries         TimeEntry[]
  timeBlocks          TimeBlock[]
  communications      Communication[]
  meetings            Meeting[]

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  lastInteractionAt   DateTime?

  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Communication {
  id              String    @id @default(cuid())
  clientId        String
  projectId       String?

  type            String    // email, call, meeting, message
  direction       String    // inbound, outbound

  subject         String
  content         String    @db.Text
  summary         String?   @db.Text

  // Email specific
  from            String?
  to              String[]
  cc              String[]
  attachments     Json[]

  // Meeting specific
  meetingDate     DateTime?
  meetingDuration Int?
  attendees       String[]
  meetingNotes    String?   @db.Text

  // Tracking
  sentiment       String?   // positive, neutral, negative
  requiresFollowUp Boolean  @default(false)
  followUpDate    DateTime?

  createdAt       DateTime  @default(now())
  responseTime    Int?      // minutes

  client          Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model Meeting {
  id                String    @id @default(cuid())
  clientId          String?
  projectId         String?

  title             String
  description       String?   @db.Text
  type              String    // discovery, check_in, sprint_review, etc.

  scheduledAt       DateTime
  duration          Int       // minutes
  timezone          String

  // Attendees
  organizer         String
  requiredAttendees String[]
  optionalAttendees String[]

  // Location
  location          String?
  meetingLink       String?

  // Preparation & Notes
  agenda            String?   @db.Text
  meetingNotes      String?   @db.Text
  actionItems       Json[]
  decisions         String[]

  status            String    // scheduled, confirmed, completed, cancelled

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  client            Client?   @relation(fields: [clientId], references: [id])
}

// Well-being & Habits
model WellBeingEntry {
  id                String    @id @default(cuid())
  userId            String
  date              DateTime  @db.Date

  // Energy
  morningEnergy     Float?
  afternoonEnergy   Float?
  eveningEnergy     Float?
  averageEnergy     Float?

  // Habits
  exerciseMinutes   Int       @default(0)
  exerciseType      String?
  readingMinutes    Int       @default(0)
  learningMinutes   Int       @default(0)
  meditationMinutes Int       @default(0)
  sleepHours        Float?
  sleepQuality      Float?

  // Journaling
  morningJournal    String?   @db.Text
  eveningReflection String?   @db.Text
  gratitude         String[]
  dailyWin          String?

  // Mood
  mood              Float?    // 1-10
  stressLevel       Float?    // 1-10
  focusQuality      Float?    // 1-10

  notes             String?   @db.Text

  createdAt         DateTime  @default(now())

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Capture & Notes
model Capture {
  id                String    @id @default(cuid())
  userId            String

  type              String    // text, voice, handwritten, email, web, image
  content           String    @db.Text
  transcription     String?   @db.Text

  status            String    @default("inbox") // inbox, processed, archived

  convertedToTaskId String?
  convertedToNoteId String?

  // AI suggestions
  suggestedProject  String?
  suggestedDueDate  DateTime?
  suggestedPriority String?
  tags              String[]

  createdAt         DateTime  @default(now())
  processedAt       DateTime?

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VoiceSession {
  id              String    @id @default(cuid())
  userId          String

  title           String
  duration        Int       // seconds
  recordedAt      DateTime

  audioFileUrl    String
  waveformData    Json?

  transcription   String?   @db.Text
  speakers        Json[]
  timestamps      Json[]

  // AI processing
  summary         String?   @db.Text
  keyPoints       String[]
  actionItems     Json[]

  projectId       String?
  tags            String[]

  processed       Boolean   @default(false)
  archivedAt      DateTime?

  createdAt       DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Calendar
model CalendarEvent {
  id                  String    @id @default(cuid())
  userId              String

  title               String
  description         String?   @db.Text

  startTime           DateTime
  endTime             DateTime
  allDay              Boolean   @default(false)
  timezone            String

  // Recurrence
  isRecurring         Boolean   @default(false)
  recurrenceRule      String?

  // Relationships
  projectId           String?
  taskId              String?
  clientId            String?
  meetingId           String?

  type                String    // task, meeting, time_block, reminder, personal

  // Notifications
  reminders           Json[]

  color               String?
  location            String?
  attendees           String[]

  // External sync
  externalCalendarId  String?
  externalEventId     String?
  syncStatus          String?   // synced, pending, error

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Analytics
model AnalyticsEvent {
  id          String    @id @default(cuid())
  userId      String

  eventType   String    // page_view, task_completed, project_created, etc.
  eventData   Json?

  sessionId   String?

  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

### File Structure (Next.js App Router)

```
/src
  /app
    /(auth)
      /login
        /page.tsx
      /register
        /page.tsx
      /layout.tsx
    /(dashboard)
      /layout.tsx (Main dashboard layout with sidebar)
      /page.tsx (Dashboard home)
      /today
        /page.tsx (Today's view - top priorities, time blocks)
      /calendar
        /page.tsx (Calendar views)
        /day/[date]
          /page.tsx
        /week/[week]
          /page.tsx
        /month/[month]
          /page.tsx
      /projects
        /page.tsx (Projects list)
        /[id]
          /page.tsx (Project detail)
      /tasks
        /page.tsx (Tasks list/board)
      /clients
        /page.tsx (Clients list)
        /[id]
          /page.tsx (Client detail)
      /analytics
        /page.tsx (Analytics dashboard)
      /planning
        /year
          /page.tsx
        /quarter
          /[quarter]
            /page.tsx
        /month
          /[month]
            /page.tsx
        /week
          /[week]
            /page.tsx
      /well-being
        /page.tsx (Well-being dashboard)
      /reviews
        /daily
          /page.tsx
        /weekly
          /page.tsx
        /monthly
          /page.tsx
      /captures
        /page.tsx (Inbox for quick captures)
      /settings
        /page.tsx
    /api
      /trpc
        /[trpc]
          /route.ts
    /layout.tsx (Root layout)
    /globals.css
  /components
    /ui (shadcn/ui components)
    /dashboard (Dashboard-specific components)
    /charts (Chart components)
    /forms (Form components)
    /layout (Sidebar, Header, etc.)
  /lib
    /trpc (tRPC setup)
    /prisma (Prisma client)
    /utils (Helper functions)
    /hooks (Custom React hooks)
  /server
    /routers (tRPC routers)
    /procedures (tRPC procedures)
  /types
    /index.ts (Shared TypeScript types)
/prisma
  /schema.prisma
  /migrations
/public
  /images
  /icons
```

---

### API Design (tRPC Routers)

**Planning Router**:

```typescript
// Year planning
createYearPlan(input: YearPlanInput)
updateYearPlan(id: string, input: YearPlanInput)
getYearPlan(year: number)

// Quarter planning
createQuarterPlan(input: QuarterPlanInput)
updateQuarterPlan(id: string, input: QuarterPlanInput)
getQuarterPlan(id: string)

// Month planning
createMonthPlan(input: MonthPlanInput)
updateMonthPlan(id: string, input: MonthPlanInput)
getMonthPlan(month: number, year: number)

// Week planning
createWeekPlan(input: WeekPlanInput)
updateWeekPlan(id: string, input: WeekPlanInput)
getWeekPlan(weekNumber: number, year: number)
getCurrentWeek()

// Day planning
createDayPlan(input: DayPlanInput)
updateDayPlan(id: string, input: DayPlanInput)
getDayPlan(date: Date)
getToday()
```

**Project Router**:

```typescript
// Projects
createProject(input: ProjectInput)
updateProject(id: string, input: ProjectInput)
deleteProject(id: string)
getProject(id: string)
getProjects(filters?: ProjectFilters)
getClientProjects(clientId: string)
updateProjectStatus(id: string, status: Status)
updateProjectCompletion(id: string, percentage: number)

// Project analytics
getProjectStats(id: string)
getProjectTimeline(id: string)
getProjectBurndown(id: string)
predictProjectCompletion(id: string)
```

**Task Router**:

```typescript
// Tasks
createTask(input: TaskInput)
updateTask(id: string, input: TaskInput)
deleteTask(id: string)
getTask(id: string)
getTasks(filters?: TaskFilters)
getTasksByProject(projectId: string)
getTasksForToday()
getTasksForWeek()

// Task status
startTask(id: string) // Sets status to in_progress, starts timer
completeTask(id: string) // Sets status to done, stops timer
blockTask(id: string, reason: string)

// Task timer
startTimer(taskId: string)
stopTimer(taskId: string)
pauseTimer(taskId: string)
getActiveTimer()
```

**Time Tracking Router**:

```typescript
// Time entries
createTimeEntry(input: TimeEntryInput)
updateTimeEntry(id: string, input: TimeEntryInput)
deleteTimeEntry(id: string)
getTimeEntries(filters?: TimeEntryFilters)
getTimeEntriesByProject(projectId: string)
getTimeEntriesByClient(clientId: string)

// Analytics
getTotalHoursWorked(startDate: Date, endDate: Date)
getHoursByProject(startDate: Date, endDate: Date)
getHoursByClient(startDate: Date, endDate: Date)
getBillableHours(startDate: Date, endDate: Date)
getRevenueByClient(startDate: Date, endDate: Date)
```

**Client Router**:

```typescript
// Clients
createClient(input: ClientInput)
updateClient(id: string, input: ClientInput)
deleteClient(id: string)
getClient(id: string)
getClients(filters?: ClientFilters)

// Client analytics
getClientStats(id: string)
getClientProjectHistory(id: string)
getClientRevenue(id: string, startDate: Date, endDate: Date)

// Communication
sendEmail(clientId: string, input: EmailInput)
logCommunication(input: CommunicationInput)
getCommunicationHistory(clientId: string)

// Meetings
scheduleMeeting(input: MeetingInput)
updateMeeting(id: string, input: MeetingInput)
cancelMeeting(id: string)
getUpcomingMeetings(clientId?: string)
```

**Analytics Router**:

```typescript
// Dashboard metrics
getDashboardMetrics(startDate: Date, endDate: Date)
getProductivityMetrics(startDate: Date, endDate: Date)
getEnergyMetrics(startDate: Date, endDate: Date)
getProgressMetrics()

// Charts data
getHoursWorkedChartData(period: "day" | "week" | "month")
getEnergyLevelsChartData(period: "day" | "week" | "month")
getProjectProgressChartData()
getTaskCompletionHeatmap(year: number)
getFocusQualityChartData()
getWorkLifeBalanceChartData()

// Insights
getWeeklyInsights()
getMonthlyInsights()
getPredictiveInsights()
getBurnoutRisk()
```

**Well-being Router**:

```typescript
// Well-being entries
createWellBeingEntry(input: WellBeingInput)
updateWellBeingEntry(id: string, input: WellBeingInput)
getWellBeingEntry(date: Date)
getWellBeingEntries(startDate: Date, endDate: Date)

// Energy tracking
logEnergy(time: "morning" | "afternoon" | "evening", level: number)
getEnergyTrends(period: number) // days

// Habits
logHabit(habit: string, value: number)
getHabitStreak(habit: string)
getHabitStats(habit: string, startDate: Date, endDate: Date)

// Recommendations
getBurnoutRisk()
getRestRecommendations()
getEnergyOptimizationSuggestions()
```

**Review Router**:

```typescript
// Reviews
createDailyReview(input: DailyReviewInput)
createWeeklyReview(input: WeeklyReviewInput)
createMonthlyReview(input: MonthlyReviewInput)
createQuarterlyReview(input: QuarterlyReviewInput)

getDailyReview(date: Date)
getWeeklyReview(weekNumber: number, year: number)
getMonthlyReview(month: number, year: number)
getQuarterlyReview(quarter: number, year: number)

// Review templates
getDailyReviewTemplate(date: Date)
getWeeklyReviewTemplate(weekNumber: number, year: number)
getMonthlyReviewTemplate(month: number, year: number)
```

**Capture Router**:

```typescript
// Quick capture
quickCapture(content: string, type: CaptureType)
processCapture(id: string, action: ProcessAction)
convertCaptureToTask(id: string, taskInput: TaskInput)
convertCaptureToNote(id: string, noteInput: NoteInput)

// Voice
createVoiceSession(input: VoiceSessionInput)
uploadVoiceRecording(file: File)
transcribeVoice(id: string)
summarizeVoiceSession(id: string)
extractActionItemsFromVoice(id: string)

// Inbox
getInbox()
archiveCapture(id: string)
deleteCapture(id: string)
```

**Calendar Router**:

```typescript
// Events
createEvent(input: CalendarEventInput)
updateEvent(id: string, input: CalendarEventInput)
deleteEvent(id: string)
getEvent(id: string)
getEvents(startDate: Date, endDate: Date)
getEventsForDay(date: Date)
getEventsForWeek(weekNumber: number, year: number)
getEventsForMonth(month: number, year: number)

// Sync
syncWithGoogleCalendar()
importExternalCalendar(url: string)
```

---

## Design System

### Color Palette

**Primary Colors**:

```
Primary: #6366f1 (Indigo) - Main actions, primary buttons, links
Secondary: #8b5cf6 (Purple) - Secondary actions, accents
Success: #10b981 (Green) - Completed tasks, positive metrics
Warning: #f59e0b (Amber) - At-risk projects, warnings
Danger: #ef4444 (Red) - Critical deadlines, errors
Info: #3b82f6 (Blue) - Information, neutral states
```

**Semantic Colors**:

```
Client Work: #6366f1 (Indigo)
Personal Projects: #8b5cf6 (Purple)
Learning: #3b82f6 (Blue)
Health: #10b981 (Green)
Deep Work: #8b5cf6 (Purple)
Shallow Work: #60a5fa (Light Blue)
Meetings: #f59e0b (Amber)
```

**Urgency Colors**:

```
Critical (< 3 days): #ef4444 (Red) - Pulsing animation
Urgent (< 7 days): #f59e0b (Amber)
Attention: #3b82f6 (Blue)
On Track: #10b981 (Green)
Ahead: #10b981 (Green) - Lighter shade
```

**Backgrounds**:

```
Light Mode:
  Primary BG: #ffffff
  Secondary BG: #f9fafb
  Tertiary BG: #f3f4f6
  Card BG: #ffffff
  Hover BG: #f3f4f6

Dark Mode:
  Primary BG: #0f172a
  Secondary BG: #1e293b
  Tertiary BG: #334155
  Card BG: #1e293b
  Hover BG: #334155
```

**Text**:

```
Light Mode:
  Primary: #0f172a
  Secondary: #475569
  Tertiary: #94a3b8
  Disabled: #cbd5e1

Dark Mode:
  Primary: #f1f5f9
  Secondary: #cbd5e1
  Tertiary: #64748b
  Disabled: #475569
```

---

### Typography

**Font Family**:

```
Display/Headers: "Cal Sans" or "Satoshi" (geometric sans)
Body: "Inter" or "Plus Jakarta Sans"
Code: "JetBrains Mono"
```

**Type Scale**:

```
H1: 48px / 56px (3rem / 3.5rem) - font-bold
H2: 36px / 44px (2.25rem / 2.75rem) - font-bold
H3: 28px / 36px (1.75rem / 2.25rem) - font-semibold
H4: 20px / 28px (1.25rem / 1.75rem) - font-semibold
Body Large: 18px / 28px (1.125rem / 1.75rem)
Body: 16px / 24px (1rem / 1.5rem)
Body Small: 14px / 20px (0.875rem / 1.25rem)
Caption: 12px / 16px (0.75rem / 1rem)
```

---

### Spacing System

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
4xl: 96px
5xl: 128px
```

---

### Component Styles

**Cards**:

```
Background: Card BG color
Border: 1px solid border color
Border Radius: 12px
Padding: 24px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover: Shadow increase, slight lift (-2px translateY)
```

**Buttons**:

Primary:

```
Background: Primary color
Text: White
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
Hover: Darken 10%, scale 1.02
Active: Scale 0.98
```

Secondary:

```
Background: Transparent
Border: 2px solid primary color
Text: Primary color
Hover: Background primary, text white
```

Danger:

```
Background: Danger color
Text: White
```

**Inputs**:

```
Background: Input BG
Border: 1px solid border color
Border Radius: 8px
Padding: 10px 14px
Focus: Border primary color, ring
```

---

### Animation Principles

**Duration**:

```
Instant: 100ms
Fast: 200ms
Normal: 300ms
Slow: 500ms
```

**Easing**:

```
In: cubic-bezier(0.4, 0, 1, 1)
Out: cubic-bezier(0, 0, 0.2, 1)
In-Out: cubic-bezier(0.4, 0, 0.2, 1)
```

**Effects**:

- Page transitions: Fade + slide up
- Card hover: Lift + shadow increase
- Button hover: Scale 1.02
- Modal entrance: Fade + scale from 0.95
- Toast notifications: Slide in from top/bottom
- Loading states: Skeleton shimmer

---

## User Experience Flows

### Onboarding Flow

1. **Account Creation**: Email/password or OAuth
2. **Welcome**: Brief intro to Baserow
3. **Setup Wizard**:
   - Set timezone
   - Define annual theme and goals (optional)
   - Import calendar (optional)
   - Add first client (optional)
   - Create first project
4. **Tour**: Interactive walkthrough of key features
5. **First Task**: Prompt to create first task

---

### Daily Workflow

1. **Morning**:
   - Open app → Today's view
   - See top 3 priorities
   - Energy check-in
   - Review time blocks
   - Adjust plan if needed

2. **During Day**:
   - Work on tasks (tap to start timer)
   - Ad-hoc tasks added as they come up
   - Check urgency dashboard periodically
   - Respond to client emails
   - Log time entries

3. **Evening**:
   - Daily review prompt
   - Complete review template
   - Energy check-in
   - Plan tomorrow's top 3
   - Review achievements

---

### Weekly Workflow

1. **Sunday Evening / Monday Morning**:
   - Weekly planning session
   - Review last week's accomplishments
   - Set top 3 outcomes for the week
   - Allocate time blocks
   - Review project deadlines

2. **Friday Evening / Sunday Afternoon**:
   - Weekly review
   - Analyze metrics
   - Celebrate wins
   - Identify lessons
   - Plan next week

---

## Success Metrics & KPIs

### Product Metrics

- **Daily Active Users (DAU)**: Target 80%+ of registered users
- **Weekly Active Users (WAU)**: Target 95%+
- **Task Completion Rate**: Average 70%+ of planned tasks
- **Time Tracking Adoption**: 80%+ of tasks tracked
- **Review Completion**: 60%+ complete weekly reviews
- **Client Project On-Time Delivery**: 85%+ on time

### User Success Metrics

- **Goal Achievement**: Users hitting 70%+ of quarterly goals
- **Burnout Prevention**: Users maintaining energy > 6/10
- **Work-Life Balance**: Users achieving planned rest days
- **Productivity Increase**: 20%+ increase in completed tasks vs. baseline

### Technical Metrics

- **Page Load Time**: < 1s
- **Time to Interactive**: < 2s
- **Lighthouse Score**: 95+
- **Uptime**: 99.9%
- **API Response Time**: < 200ms p95

---

## Development Roadmap

### Phase 1: MVP (Months 1-2)

**Core Features**:

- User authentication
- Project & task management
- Basic time tracking (manual + timer)
- Today's view
- Week planning
- Daily review template
- Basic analytics dashboard (hours worked, tasks completed)
- Mobile-responsive design

**Goal**: Functional productivity system for solo use

---

### Phase 2: Enhanced Tracking (Month 3)

**Features**:

- Calendar integration (Google Calendar)
- Energy tracking
- Well-being routines
- Weekly review system
- Urgency dashboard with deadline tracking
- Client management basics
- Time blocking interface

**Goal**: Complete tracking and planning system

---

### Phase 3: Client Management (Month 4)

**Features**:

- Client profiles
- Email integration (send emails)
- Meeting scheduler
- Communication logging
- Client-specific metrics
- Project-client linking
- Billing/revenue tracking

**Goal**: Comprehensive client management

---

### Phase 4: Analytics & Insights (Month 5)

**Features**:

- Advanced charts (all 8 chart types)
- Energy pattern analysis
- Burnout risk detection
- Predictive project completion
- Weekly automated insights
- Monthly reports
- Export capabilities

**Goal**: Data-driven productivity optimization

---

### Phase 5: AI Features (Month 6)

**Features**:

- Voice note transcription
- Quick capture with AI parsing
- Research assistant (Claude MCP)
- AI-generated insights
- Project breakdown assistant
- Email drafting assistance

**Goal**: AI-powered productivity enhancement

---

### Phase 6: Advanced Features (Month 7+)

**Features**:

- Handwritten note support
- Advanced voice sessions
- Team collaboration (multi-user)
- Client portal
- Mobile app (React Native)
- Offline mode
- Advanced integrations

**Goal**: Complete life operating system

---

## Launch Strategy

### Pre-Launch (Month 1-2)

- Build MVP
- Private beta with 10-20 users
- Gather feedback
- Iterate on core features

### Soft Launch (Month 3)

- Launch to personal network
- Create landing page
- Start blog/content marketing
- Build in public on Twitter/LinkedIn

### Public Launch (Month 4-5)

- Product Hunt launch
- Content marketing push
- Influencer outreach
- Community building

### Growth (Month 6+)

- Paid marketing (if validated)
- Partnerships
- Enterprise features
- Team/collaboration tier

---

## Monetization Strategy

### Pricing Tiers

**Free Tier**:

- 3 active projects
- 50 tasks/month
- Basic analytics
- 1 client
- 7-day history
- Mobile web access

**Pro Tier** (R199/month or R1,990/year):

- Unlimited projects
- Unlimited tasks
- Advanced analytics
- Unlimited clients
- Full history
- Voice notes (10 hours/month)
- Email integration
- Calendar sync
- Priority support
- Export data
- Mobile app access

**Teams Tier** (R499/month or R4,990/year) - Future:

- Everything in Pro
- Up to 5 team members
- Shared projects
- Team analytics
- Client portal
- White-label reports
- API access

**Target**:

- 100 paying users by end of Year 1: R19,900/month = R238,800/year
- 500 paying users by end of Year 2: R99,500/month = R1,194,000/year

---

## Final Notes

### Critical Success Factors

1. **Frictionless mobile experience**: Most usage will be mobile
2. **Beautiful, motivating design**: Users need to WANT to open the app
3. **Fast performance**: No lag, instant updates
4. **Reliable time tracking**: Core value prop
5. **Insightful analytics**: Show progress, motivate continuation
6. **Smart defaults**: Minimize configuration overhead
7. **AI that adds value**: Not gimmicks, real productivity gains

### Differentiation from Competitors

- **Notion**: Less flexible but more opinionated for productivity
- **Todoist**: More comprehensive (planning, analytics, client management)
- **ClickUp**: Simpler, more personal, better design
- **Asana**: Individual-focused vs. team-focused
- **Sunsama**: Similar ethos but broader scope (year → day), AI-powered

### Vision

Baserow becomes the operating system for high-achievers and solo entrepreneurs who want to:

- Never rely on memory
- Build systems that execute
- Track everything that matters
- Optimize for sustainable high performance
- Balance client work with personal growth
- Make data-driven decisions about their time and energy

---

## Technical Implementation Instructions for AI

1. **Start with Authentication & User Management**
2. **Build Core Data Models** (Year → Quarter → Month → Week → Day → Tasks)
3. **Implement Project & Task Management**
4. **Build Time Tracking System** (manual + automatic)
5. **Create Today's View** (mobile-first)
6. **Implement Calendar System**
7. **Build Analytics Dashboard** with charts
8. **Add Client Management**
9. **Implement Review System**
10. **Add Energy & Well-being Tracking**
11. **Build Urgency Dashboard**
12. **Integrate AI Features** (voice, insights)

### Development Principles

- **Mobile-first**: Design for mobile, enhance for desktop
- **Offline-capable**: Core features work offline, sync when online
- **Performance**: < 1s page loads, optimistic UI updates
- **Type-safe**: Full TypeScript coverage, no `any`
- **Accessible**: WCAG 2.1 AA compliance
- **Tested**: Unit + integration + E2E tests
- **Documented**: Code comments, API docs, user guides

---

This is the complete, comprehensive specification for Baserow - the ultimate life and productivity management system. Build this, and never rely on memory again. 🚀
