# AI CRM UI Builder - Master Prompt
## Complete Agency CRM User Interface System

---

## CONTEXT & MISSION

You are an expert frontend developer and UI/UX designer tasked with building a beautiful, intuitive, and highly functional CRM (Customer Relationship Management) user interface for a solo developer running an agency. This CRM UI will be integrated into an existing Next.js productivity application.

**Your Goal:** Create a modern, professional CRM interface that makes relationship management effortless, surfaces key insights prominently, and provides excellent user experience across all CRM features.

---

## TECH STACK (NON-NEGOTIABLE)

- **Framework:** Next.js 14+ (App Router)
- **UI Library:** shadcn/ui components
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Charts:** Recharts
- **State Management:** TanStack Query (React Query) via tRPC
- **Forms:** React Hook Form + Zod validation
- **Drag & Drop:** @dnd-kit/core
- **Date Handling:** date-fns
- **Tables:** TanStack Table (React Table)

---

## DESIGN PRINCIPLES

### 1. **Visual Hierarchy**
- Most important information should be immediately visible
- Use color, size, and spacing to create clear hierarchy
- Health scores, at-risk clients, and high-value deals get prominence

### 2. **Data Density vs Clarity**
- Balance information density with readability
- Use progressive disclosure (show summary, expand for details)
- Smart defaults with powerful filtering

### 3. **Action-Oriented Design**
- Primary actions (call, email, convert) always accessible
- Reduce clicks to complete common tasks
- Keyboard shortcuts for power users

### 4. **Responsive & Mobile-First**
- Desktop-optimized but fully functional on mobile
- Touch-friendly targets on mobile
- Appropriate information hiding on smaller screens

### 5. **Color System for Meaning**
- **Green:** Healthy clients, won deals, positive metrics
- **Red:** At-risk clients, lost deals, alerts
- **Yellow/Amber:** Medium priority, needs attention
- **Blue:** Neutral info, actions, navigation
- **Gray:** Secondary info, disabled states

---

## CRM UI STRUCTURE

```
/app/(dashboard)/crm/
├── page.tsx                      # CRM Dashboard (Overview)
├── leads/
│   ├── page.tsx                  # Leads Kanban/List View
│   ├── [id]/
│   │   └── page.tsx              # Lead Detail Page
│   └── new/
│       └── page.tsx              # Create Lead Form
├── pipeline/
│   ├── page.tsx                  # Visual Pipeline View
│   └── [id]/
│       └── page.tsx              # Deal Detail Page
├── clients/
│   ├── page.tsx                  # Clients List/Grid View
│   └── [id]/
│       ├── page.tsx              # Client 360 View
│       ├── health/
│       │   └── page.tsx          # Health Score Details
│       └── activities/
│           └── page.tsx          # Activity Timeline
├── activities/
│   └── page.tsx                  # All Activities Feed
└── settings/
    ├── pipelines/
    │   └── page.tsx              # Pipeline Configuration
    └── integrations/
        └── page.tsx              # Email/Calendar Setup
```

---

## DETAILED UI SPECIFICATIONS

---

## 1. CRM DASHBOARD (`/crm/page.tsx`)

### Layout Structure:
```
┌─────────────────────────────────────────────────────┐
│ Header: "CRM Dashboard" + Quick Actions             │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ Metric  │ │ Metric  │ │ Metric  │ │ Metric  │   │
│ │  Card   │ │  Card   │ │  Card   │ │  Card   │   │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  Pipeline Visual     │   At-Risk Clients            │
│  (Mini Chart)        │   (Alert List)               │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│                                                      │
│           Recent Activities Feed                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Components Needed:

#### **KPI Metric Cards** (Top Row - 4 cards)
```tsx
// Example structure for each card
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Active Leads
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">247</div>
    <div className="flex items-center gap-1 text-sm">
      <TrendingUp className="h-4 w-4 text-green-600" />
      <span className="text-green-600">+12% from last month</span>
    </div>
  </CardContent>
</Card>
```

**4 Metric Cards:**
1. **Active Leads**
   - Total count
   - Trend (% change from last month)
   - Icon: Users
   - Click → Navigate to /crm/leads

2. **Pipeline Value**
   - Total weighted deal value
   - Trend indicator
   - Icon: DollarSign
   - Click → Navigate to /crm/pipeline

3. **Clients at Risk**
   - Count of clients with health < 50
   - Show as alert if > 0
   - Icon: AlertTriangle
   - Click → Navigate to /crm/clients?filter=at-risk

4. **This Month's Revenue**
   - Total closed won deals this month
   - Progress toward monthly goal
   - Icon: TrendingUp
   - Click → Revenue report

#### **Pipeline Mini Chart**
```tsx
<Card className="col-span-2">
  <CardHeader>
    <CardTitle>Sales Pipeline</CardTitle>
    <CardDescription>Weighted value by stage</CardDescription>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={pipelineData}>
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

**Data Shape:**
```typescript
const pipelineData = [
  { stage: "Discovery", value: 45000, count: 12 },
  { stage: "Proposal", value: 78000, count: 8 },
  { stage: "Negotiation", value: 120000, count: 5 },
  { stage: "Closed Won", value: 95000, count: 7 }
];
```

#### **At-Risk Clients Alert Panel**
```tsx
<Card className="col-span-1">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-red-500" />
      At-Risk Clients
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {atRiskClients.map(client => (
        <div key={client.id} className="flex items-center justify-between border-l-4 border-red-500 pl-3 py-2">
          <div>
            <p className="font-medium">{client.name}</p>
            <p className="text-sm text-muted-foreground">
              Health: {client.healthScore}/100
            </p>
          </div>
          <Button size="sm" variant="outline">
            View
          </Button>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

#### **Recent Activities Feed**
```tsx
<Card className="col-span-3">
  <CardHeader>
    <CardTitle>Recent Activities</CardTitle>
    <CardDescription>Latest interactions with leads and clients</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {activities.map(activity => (
        <div key={activity.id} className="flex items-start gap-4">
          {/* Icon based on activity type */}
          <div className={cn(
            "rounded-full p-2",
            activity.type === 'EMAIL' && "bg-blue-100",
            activity.type === 'CALL' && "bg-green-100",
            activity.type === 'MEETING' && "bg-purple-100"
          )}>
            {getActivityIcon(activity.type)}
          </div>
          
          {/* Activity details */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">{activity.subject}</p>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(activity.completedAt)} ago
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {activity.contactName} • {activity.companyName}
            </p>
            {activity.sentiment && (
              <Badge variant={getSentimentVariant(activity.sentiment)}>
                {getSentimentLabel(activity.sentiment)}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## 2. LEADS PAGE (`/crm/leads/page.tsx`)

### Layout: Kanban Board with Filters

```
┌─────────────────────────────────────────────────────┐
│ Header: "Leads" + [View Toggle] + [+ New Lead]      │
├─────────────────────────────────────────────────────┤
│ Filters: [Source] [Score] [Date] [Search]   [Sort] │
├─────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │ NEW  │ │CONTACTED│QUALIFIED│PROPOSAL│ WON  │      │
│ ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤      │
│ │Card1 │ │Card1 │ │Card1 │ │Card1 │ │Card1 │      │
│ │Card2 │ │Card2 │ │Card2 │ │Card2 │ │Card2 │      │
│ │Card3 │ │      │ │      │ │      │ │      │      │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
└─────────────────────────────────────────────────────┘
```

### Components Needed:

#### **View Toggle**
```tsx
<Tabs defaultValue="kanban">
  <TabsList>
    <TabsTrigger value="kanban">
      <LayoutGrid className="h-4 w-4 mr-2" />
      Kanban
    </TabsTrigger>
    <TabsTrigger value="list">
      <List className="h-4 w-4 mr-2" />
      List
    </TabsTrigger>
    <TabsTrigger value="table">
      <Table className="h-4 w-4 mr-2" />
      Table
    </TabsTrigger>
  </TabsList>
</Tabs>
```

#### **Filter Bar**
```tsx
<div className="flex items-center gap-3">
  {/* Source Filter */}
  <Select>
    <SelectTrigger className="w-[150px]">
      <SelectValue placeholder="All Sources" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Sources</SelectItem>
      <SelectItem value="inbound">Inbound</SelectItem>
      <SelectItem value="referral">Referral</SelectItem>
      <SelectItem value="outbound">Outbound</SelectItem>
    </SelectContent>
  </Select>

  {/* Score Filter */}
  <Select>
    <SelectTrigger className="w-[150px]">
      <SelectValue placeholder="All Scores" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Scores</SelectItem>
      <SelectItem value="hot">Hot (80+)</SelectItem>
      <SelectItem value="warm">Warm (50-79)</SelectItem>
      <SelectItem value="cold">Cold (<50)</SelectItem>
    </SelectContent>
  </Select>

  {/* Search */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input 
      placeholder="Search leads..." 
      className="pl-10"
    />
  </div>

  {/* Sort */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">
        <ArrowUpDown className="h-4 w-4 mr-2" />
        Sort
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Score (High to Low)</DropdownMenuItem>
      <DropdownMenuItem>Recent Activity</DropdownMenuItem>
      <DropdownMenuItem>Company Name</DropdownMenuItem>
      <DropdownMenuItem>Date Added</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

#### **Kanban Column**
```tsx
<div className="flex-1 min-w-[280px]">
  <div className="mb-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold">{status}</h3>
      <Badge variant="secondary">{leads.length}</Badge>
    </div>
    <div className="text-sm text-muted-foreground">
      ${totalValue.toLocaleString()} total value
    </div>
  </div>

  <Droppable droppableId={status}>
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="space-y-3 min-h-[500px] bg-muted/30 rounded-lg p-3"
      >
        {leads.map((lead, index) => (
          <LeadCard key={lead.id} lead={lead} index={index} />
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</div>
```

#### **Lead Card** (Draggable)
```tsx
<Draggable draggableId={lead.id} index={index}>
  {(provided, snapshot) => (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        snapshot.isDragging && "shadow-lg"
      )}
    >
      <CardContent className="p-4">
        {/* Header: Name + Score */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {lead.companyName}
            </p>
          </div>
          
          {/* Lead Score Badge */}
          <Badge 
            variant={getScoreBadgeVariant(lead.score)}
            className="font-semibold"
          >
            {lead.score}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{lead.phone}</span>
            </div>
          )}
        </div>

        {/* Value & Last Activity */}
        {lead.estimatedValue && (
          <div className="text-sm font-medium text-green-600 mb-2">
            ${lead.estimatedValue.toLocaleString()} potential
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Last activity: {formatDistanceToNow(lead.lastEngagement)} ago
        </div>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {lead.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {lead.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{lead.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button size="sm" variant="ghost" className="flex-1">
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button size="sm" variant="ghost" className="flex-1">
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Convert to Client</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )}
</Draggable>
```

**Helper Functions:**
```typescript
function getScoreBadgeVariant(score: number) {
  if (score >= 80) return "default"; // Hot - green
  if (score >= 50) return "secondary"; // Warm - yellow
  return "outline"; // Cold - gray
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 50) return "text-amber-600 bg-amber-50";
  return "text-gray-600 bg-gray-50";
}
```

---

## 3. LEAD DETAIL PAGE (`/crm/leads/[id]/page.tsx`)

### Layout: Split View with Tabs

```
┌─────────────────────────────────────────────────────┐
│ Header: Lead Name + Actions [Edit] [Convert] [...]  │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  LEFT SIDEBAR        │  MAIN CONTENT AREA           │
│  (Lead Info Card)    │                              │
│                      │  Tabs: [Overview] [Activity] │
│  - Avatar            │        [Notes] [Emails]      │
│  - Name              │                              │
│  - Score Badge       │  ┌────────────────────────┐  │
│  - Company           │  │                        │  │
│  - Contact Info      │  │   Tab Content          │  │
│  - Tags              │  │                        │  │
│                      │  │                        │  │
│  Quick Actions:      │  └────────────────────────┘  │
│  [📧 Email]          │                              │
│  [📞 Call]           │                              │
│  [📅 Schedule]       │                              │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

### Components Needed:

#### **Lead Info Sidebar**
```tsx
<Card className="sticky top-4">
  <CardContent className="p-6">
    {/* Avatar with score indicator */}
    <div className="flex flex-col items-center mb-6">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="text-2xl">
            {getInitials(lead.firstName, lead.lastName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Score badge overlaying avatar */}
        <Badge 
          className={cn(
            "absolute -bottom-2 left-1/2 -translate-x-1/2",
            getScoreColor(lead.score)
          )}
        >
          Score: {lead.score}
        </Badge>
      </div>

      <h2 className="text-xl font-bold mt-4 text-center">
        {lead.firstName} {lead.lastName}
      </h2>
      <p className="text-muted-foreground text-center">{lead.title}</p>
      <p className="font-medium text-center mt-1">{lead.companyName}</p>
    </div>

    {/* Contact Information */}
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <a href={`mailto:${lead.email}`} className="text-sm hover:underline">
          {lead.email}
        </a>
      </div>
      
      {lead.phone && (
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${lead.phone}`} className="text-sm hover:underline">
            {lead.phone}
          </a>
        </div>
      )}
      
      {lead.linkedInUrl && (
        <div className="flex items-center gap-3">
          <Linkedin className="h-4 w-4 text-muted-foreground" />
          <a 
            href={lead.linkedInUrl} 
            target="_blank" 
            className="text-sm hover:underline"
          >
            LinkedIn Profile
          </a>
        </div>
      )}
      
      {lead.companyWebsite && (
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <a 
            href={lead.companyWebsite} 
            target="_blank" 
            className="text-sm hover:underline"
          >
            {new URL(lead.companyWebsite).hostname}
          </a>
        </div>
      )}
    </div>

    {/* Key Metrics */}
    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">Source</p>
        <p className="font-medium">{formatSource(lead.source)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Status</p>
        <Badge>{lead.status}</Badge>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Est. Value</p>
        <p className="font-medium">
          {lead.estimatedValue 
            ? `$${lead.estimatedValue.toLocaleString()}` 
            : 'TBD'
          }
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Last Contact</p>
        <p className="font-medium">
          {formatDistanceToNow(lead.lastEngagement)} ago
        </p>
      </div>
    </div>

    {/* Tags */}
    {lead.tags.length > 0 && (
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-2">Tags</p>
        <div className="flex flex-wrap gap-2">
          {lead.tags.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      </div>
    )}

    {/* Quick Actions */}
    <div className="space-y-2">
      <Button className="w-full" onClick={() => openEmailComposer(lead)}>
        <Mail className="h-4 w-4 mr-2" />
        Send Email
      </Button>
      <Button variant="outline" className="w-full">
        <Phone className="h-4 w-4 mr-2" />
        Call Now
      </Button>
      <Button variant="outline" className="w-full">
        <Calendar className="h-4 w-4 mr-2" />
        Schedule Meeting
      </Button>
      <Button 
        variant="default" 
        className="w-full bg-green-600 hover:bg-green-700"
      >
        <UserCheck className="h-4 w-4 mr-2" />
        Convert to Client
      </Button>
    </div>
  </CardContent>
</Card>
```

#### **Main Content Tabs**
```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activity">
      Activity
      {newActivityCount > 0 && (
        <Badge variant="destructive" className="ml-2">
          {newActivityCount}
        </Badge>
      )}
    </TabsTrigger>
    <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
    <TabsTrigger value="emails">Emails ({emails.length})</TabsTrigger>
    <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
  </TabsList>

  {/* Overview Tab */}
  <TabsContent value="overview" className="space-y-6">
    {/* Company Information Card */}
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Industry</dt>
            <dd className="font-medium">{lead.industry || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Company Size</dt>
            <dd className="font-medium">{lead.companySize || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Revenue</dt>
            <dd className="font-medium">{lead.revenue || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">First Contact</dt>
            <dd className="font-medium">
              {format(lead.firstTouchpoint, 'MMM d, yyyy')}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>

    {/* Pain Points & Needs */}
    {lead.painPoints.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Pain Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {lead.painPoints.map((pain, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{pain}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}

    {/* Buying Signals */}
    {lead.buyingSignals.length > 0 && (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-5 w-5" />
            Buying Signals Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {lead.buyingSignals.map(signal => (
              <Badge key={signal} variant="outline" className="bg-white">
                {formatBuyingSignal(signal)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    )}

    {/* Enrichment Data (if available) */}
    {lead.technographics && (
      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
          <CardDescription>Auto-detected from company website</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lead.technographics.languages && (
              <div>
                <p className="text-sm font-medium mb-2">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {lead.technographics.languages.map(lang => (
                    <Badge key={lang} variant="secondary">{lang}</Badge>
                  ))}
                </div>
              </div>
            )}
            {lead.technographics.frameworks && (
              <div>
                <p className="text-sm font-medium mb-2">Frameworks</p>
                <div className="flex flex-wrap gap-2">
                  {lead.technographics.frameworks.map(fw => (
                    <Badge key={fw} variant="secondary">{fw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )}
  </TabsContent>

  {/* Activity Tab */}
  <TabsContent value="activity">
    <ActivityTimeline activities={activities} />
  </TabsContent>

  {/* Notes Tab */}
  <TabsContent value="notes">
    <NotesSection leadId={lead.id} notes={notes} />
  </TabsContent>

  {/* Emails Tab */}
  <TabsContent value="emails">
    <EmailsList leadId={lead.id} emails={emails} />
  </TabsContent>
</Tabs>
```

#### **Activity Timeline Component**
```tsx
function ActivityTimeline({ activities }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity Timeline</CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={cn(
                  "relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-background",
                  getActivityColor(activity.type)
                )}>
                  {getActivityIcon(activity.type)}
                </div>

                {/* Activity content */}
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{activity.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(activity.completedAt, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      
                      <Badge variant={getActivityTypeBadge(activity.type)}>
                        {activity.type}
                      </Badge>
                    </div>

                    {activity.description && (
                      <p className="text-sm mb-3">{activity.description}</p>
                    )}

                    {/* Sentiment indicator */}
                    {activity.sentiment !== null && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">
                          Sentiment:
                        </span>
                        <Badge variant={getSentimentBadge(activity.sentiment)}>
                          {getSentimentEmoji(activity.sentiment)} {' '}
                          {getSentimentLabel(activity.sentiment)}
                        </Badge>
                      </div>
                    )}

                    {/* Key topics */}
                    {activity.keyTopics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {activity.keyTopics.map(topic => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action items from this activity */}
                    {activity.actionItems.length > 0 && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-2">Action Items:</p>
                        <ul className="space-y-1">
                          {activity.actionItems.map((item, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <Checkbox />
                              {item.task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Activity Icon Helper:**
```typescript
function getActivityIcon(type: string) {
  const icons = {
    EMAIL: <Mail className="h-6 w-6" />,
    CALL: <Phone className="h-6 w-6" />,
    MEETING: <Calendar className="h-6 w-6" />,
    DEMO: <Video className="h-6 w-6" />,
    PROPOSAL: <FileText className="h-6 w-6" />,
    NOTE: <StickyNote className="h-6 w-6" />,
  };
  return icons[type] || <Activity className="h-6 w-6" />;
}

function getActivityColor(type: string) {
  const colors = {
    EMAIL: "bg-blue-500 text-white",
    CALL: "bg-green-500 text-white",
    MEETING: "bg-purple-500 text-white",
    DEMO: "bg-orange-500 text-white",
    PROPOSAL: "bg-pink-500 text-white",
    NOTE: "bg-gray-500 text-white",
  };
  return colors[type] || "bg-gray-500 text-white";
}

function getSentimentEmoji(sentiment: number) {
  if (sentiment > 0.5) return "😊";
  if (sentiment > 0) return "🙂";
  if (sentiment === 0) return "😐";
  if (sentiment > -0.5) return "😕";
  return "😞";
}

function getSentimentBadge(sentiment: number) {
  if (sentiment > 0.3) return "default"; // Green
  if (sentiment > -0.3) return "secondary"; // Gray
  return "destructive"; // Red
}
```

---

## 4. PIPELINE PAGE (`/crm/pipeline/page.tsx`)

### Layout: Visual Sales Pipeline

```
┌─────────────────────────────────────────────────────┐
│ Header: Pipeline Name Selector + Total Value        │
├─────────────────────────────────────────────────────┤
│ Forecast: $XXX,XXX weighted | $XXX,XXX total        │
├─────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │DISCOVERY│ │PROPOSAL│ │NEGOTIA.│ │CLOSED  │        │
│ │$45k (12)│ │$78k (8)│ │$120k(5)│ │$95k (7)│        │
│ │25% prob │ │50% prob│ │75% prob│ │100%    │        │
│ ├────────┤ ├────────┤ ├────────┤ ├────────┤        │
│ │Deal 1  │ │Deal 1  │ │Deal 1  │ │Deal 1  │        │
│ │Deal 2  │ │Deal 2  │ │        │ │Deal 2  │        │
│ │Deal 3  │ │        │ │        │ │        │        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────┘
```

### Components Needed:

#### **Pipeline Header**
```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    {/* Pipeline Selector */}
    <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
      <SelectTrigger className="w-[250px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {pipelines.map(pipeline => (
          <SelectItem key={pipeline.id} value={pipeline.id}>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: pipeline.color }}
              />
              {pipeline.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Button variant="outline" size="sm">
      <Settings className="h-4 w-4 mr-2" />
      Configure Pipeline
    </Button>
  </div>

  <Button>
    <Plus className="h-4 w-4 mr-2" />
    New Deal
  </Button>
</div>
```

#### **Forecast Summary Bar**
```tsx
<Card className="mb-6">
  <CardContent className="p-6">
    <div className="grid grid-cols-4 gap-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Total Pipeline Value</p>
        <p className="text-3xl font-bold">
          ${totalPipelineValue.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {totalDeals} deals
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Weighted Value</p>
        <p className="text-3xl font-bold text-blue-600">
          ${weightedValue.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Probability-adjusted
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Avg. Deal Size</p>
        <p className="text-3xl font-bold">
          ${avgDealSize.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Based on {totalDeals} deals
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
        <p className="text-3xl font-bold text-green-600">
          {winRate}%
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Last 90 days
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

#### **Pipeline Stage Column**
```tsx
function PipelineStage({ stage, deals }) {
  const stageValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const stageWeightedValue = deals.reduce(
    (sum, deal) => sum + deal.weightedValue, 
    0
  );

  return (
    <div className="flex-1 min-w-[280px]">
      {/* Stage Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{stage.name}</h3>
          <Badge variant="secondary">
            {deals.length}
          </Badge>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-medium">
              ${stageValue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Weighted:</span>
            <span className="font-medium text-blue-600">
              ${stageWeightedValue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Win Probability:</span>
            <span className="font-medium">
              {(stage.probability * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Droppable Zone */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-3 min-h-[600px] rounded-lg p-3 transition-colors",
              snapshot.isDraggingOver ? "bg-blue-50 border-2 border-blue-200" : "bg-muted/30"
            )}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {provided.placeholder}
            
            {deals.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-sm">No deals in this stage</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
```

#### **Deal Card** (in Pipeline)
```tsx
<Draggable draggableId={deal.id} index={index}>
  {(provided, snapshot) => (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all",
        snapshot.isDragging && "shadow-xl ring-2 ring-primary"
      )}
      onClick={() => router.push(`/crm/pipeline/${deal.id}`)}
    >
      <CardContent className="p-4">
        {/* Deal Name */}
        <h4 className="font-semibold mb-2 line-clamp-1">
          {deal.name}
        </h4>

        {/* Company/Contact */}
        <p className="text-sm text-muted-foreground mb-3">
          {deal.clientName || deal.leadName}
        </p>

        {/* Value & Weighted Value */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Value</p>
            <p className="text-xl font-bold text-green-600">
              ${deal.value.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Weighted</p>
            <p className="text-lg font-semibold text-blue-600">
              ${deal.weightedValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Expected Close Date */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            isOverdue(deal.expectedCloseDate) && "text-red-600 font-medium"
          )}>
            {format(deal.expectedCloseDate, 'MMM d, yyyy')}
          </span>
          {isOverdue(deal.expectedCloseDate) && (
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          )}
        </div>

        {/* Next Step */}
        {deal.nextStep && (
          <div className="mb-3 p-2 bg-muted rounded text-sm">
            <p className="text-muted-foreground text-xs mb-1">Next Step:</p>
            <p className="line-clamp-2">{deal.nextStep}</p>
          </div>
        )}

        {/* Days in Stage Indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            In stage: {getDaysInStage(deal.stageEnteredAt)} days
          </span>
          {isDealStale(deal.stageEnteredAt, stage.daysInStageAlert) && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              <Clock className="h-3 w-3 mr-1" />
              Stale
            </Badge>
          )}
        </div>

        {/* Progress Bar (if applicable) */}
        {deal.probability < 1 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Probability</span>
              <span className="font-medium">{(deal.probability * 100).toFixed(0)}%</span>
            </div>
            <Progress value={deal.probability * 100} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )}
</Draggable>
```

---

## 5. CLIENTS PAGE (`/crm/clients/page.tsx`)

### Layout: Grid View with Health Indicators

```
┌─────────────────────────────────────────────────────┐
│ Header: "Clients" + Filters + [+ New Client]        │
├─────────────────────────────────────────────────────┤
│ Quick Filters: [All] [Healthy] [At Risk] [VIP]     │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │Client 1 │ │Client 2 │ │Client 3 │ │Client 4 │   │
│ │Health:95│ │Health:45│ │Health:78│ │Health:62│   │
│ │🟢      │ │🔴      │ │🟡      │ │🟡      │   │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────┘
```

### Components Needed:

#### **Health Filter Tabs**
```tsx
<Tabs defaultValue="all" className="mb-6">
  <TabsList className="grid w-full max-w-[600px] grid-cols-5">
    <TabsTrigger value="all">
      All ({clientCounts.total})
    </TabsTrigger>
    <TabsTrigger value="healthy">
      <span className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        Healthy ({clientCounts.healthy})
      </span>
    </TabsTrigger>
    <TabsTrigger value="at-risk">
      <span className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        At Risk ({clientCounts.atRisk})
      </span>
    </TabsTrigger>
    <TabsTrigger value="expansion">
      <span className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Expansion ({clientCounts.expansion})
      </span>
    </TabsTrigger>
    <TabsTrigger value="vip">
      <span className="flex items-center gap-1">
        <Star className="h-3 w-3" />
        VIP ({clientCounts.vip})
      </span>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

#### **Client Health Card**
```tsx
function ClientHealthCard({ client, healthScore }) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={() => router.push(`/crm/clients/${client.id}`)}
    >
      <CardContent className="p-6">
        {/* Header with Health Score */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={getHealthColor(healthScore.overallScore)}>
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{client.name}</h3>
              <p className="text-sm text-muted-foreground">
                {client.companyName}
              </p>
            </div>
          </div>

          {/* Health Score Badge */}
          <div className="text-right">
            <div className={cn(
              "text-3xl font-bold",
              getHealthScoreColor(healthScore.overallScore)
            )}>
              {healthScore.overallScore}
            </div>
            <p className="text-xs text-muted-foreground">Health Score</p>
          </div>
        </div>

        {/* Health Score Breakdown */}
        <div className="space-y-2 mb-4">
          <HealthScoreBar 
            label="Engagement" 
            score={healthScore.engagementScore} 
          />
          <HealthScoreBar 
            label="Relationship" 
            score={healthScore.relationshipScore} 
          />
          <HealthScoreBar 
            label="Payment" 
            score={healthScore.paymentScore} 
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted rounded-lg text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Lifetime Value</p>
            <p className="font-semibold">
              ${client.lifetimeValue.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Last Contact</p>
            <p className="font-semibold">
              {healthScore.daysSinceLastContact}d ago
            </p>
          </div>
        </div>

        {/* Active Alerts */}
        {healthScore.activeAlerts.length > 0 && (
          <div className="space-y-2 mb-4">
            {healthScore.activeAlerts.map(alert => (
              <Alert key={alert} variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {formatAlert(alert)}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Trend Indicator */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            {getTrendIcon(healthScore.trend)}
            <span className={cn(
              "font-medium",
              healthScore.trend === 'improving' && "text-green-600",
              healthScore.trend === 'declining' && "text-red-600"
            )}>
              {healthScore.trend === 'improving' && 'Improving'}
              {healthScore.trend === 'declining' && 'Declining'}
              {healthScore.trend === 'stable' && 'Stable'}
            </span>
          </div>

          <Button variant="ghost" size="sm" className="group-hover:bg-accent">
            View Details
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Expansion Opportunity Badge */}
        {healthScore.expansionPotential > 0.7 && (
          <Badge className="w-full mt-3 bg-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            High Expansion Potential
          </Badge>
        )}

        {/* Churn Risk Badge */}
        {healthScore.churnRisk > 0.7 && (
          <Badge variant="destructive" className="w-full mt-3">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High Churn Risk
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

#### **Health Score Progress Bar Component**
```tsx
function HealthScoreBar({ label, score }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <Progress 
        value={score} 
        className={cn(
          "h-2",
          score >= 70 && "[&>div]:bg-green-500",
          score >= 40 && score < 70 && "[&>div]:bg-amber-500",
          score < 40 && "[&>div]:bg-red-500"
        )}
      />
    </div>
  );
}
```

---

## 6. CLIENT 360 VIEW (`/crm/clients/[id]/page.tsx`)

### Layout: Comprehensive Client Dashboard

```
┌─────────────────────────────────────────────────────┐
│ Header: Client Name + Health Score Ring Chart       │
├──────────────────────┬──────────────────────────────┤
│  LEFT SIDEBAR        │  MAIN CONTENT                │
│  - Contact Info      │                              │
│  - Account Details   │  Tabs:                       │
│  - Key Contacts      │  [Overview] [Projects]       │
│  - Quick Actions     │  [Health] [Activities]       │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

### Components Needed:

#### **Client Header with Health Ring**
```tsx
<div className="flex items-center justify-between mb-8">
  <div className="flex items-center gap-6">
    <Avatar className="h-20 w-20">
      <AvatarFallback className="text-2xl">
        {getInitials(client.name)}
      </AvatarFallback>
    </Avatar>
    
    <div>
      <h1 className="text-3xl font-bold mb-1">{client.name}</h1>
      <p className="text-lg text-muted-foreground">
        {client.companyName}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <Badge>{client.accountTier}</Badge>
        <Badge variant="outline">{client.industry}</Badge>
      </div>
    </div>
  </div>

  {/* Health Score Ring Chart */}
  <div className="flex flex-col items-center">
    <div className="relative">
      {/* Circular progress ring */}
      <svg className="w-32 h-32 -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-muted"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={`${2 * Math.PI * 56}`}
          strokeDashoffset={`${2 * Math.PI * 56 * (1 - healthScore.overallScore / 100)}`}
          className={getHealthStrokeColor(healthScore.overallScore)}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Score in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn(
          "text-4xl font-bold",
          getHealthScoreColor(healthScore.overallScore)
        )}>
          {healthScore.overallScore}
        </div>
        <div className="text-xs text-muted-foreground">Health</div>
      </div>
    </div>
    
    <div className="mt-2 text-center">
      <div className="flex items-center gap-1 text-sm">
        {getTrendIcon(healthScore.trend)}
        <span className={getTrendColor(healthScore.trend)}>
          {healthScore.trend}
        </span>
      </div>
    </div>
  </div>
</div>
```

#### **Health Score Details Tab**
```tsx
<TabsContent value="health" className="space-y-6">
  {/* Score Breakdown */}
  <Card>
    <CardHeader>
      <CardTitle>Health Score Breakdown</CardTitle>
      <CardDescription>
        Last calculated {formatDistanceToNow(healthScore.lastCalculatedAt)} ago
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {/* Engagement Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Engagement ({healthScore.engagementScore}/100)
            </h4>
            <Badge variant={getScoreVariant(healthScore.engagementScore)}>
              {getScoreLabel(healthScore.engagementScore)}
            </Badge>
          </div>
          <Progress value={healthScore.engagementScore} className="mb-3" />
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Last Contact</p>
              <p className="font-semibold">
                {healthScore.daysSinceLastContact} days ago
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Frequency</p>
              <p className="font-semibold">
                {/* Calculate based on communications */}
                2.3x per week
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Response Time</p>
              <p className="font-semibold">
                4.2 hours avg
              </p>
            </div>
          </div>
        </div>

        {/* Relationship Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Relationship ({healthScore.relationshipScore}/100)
            </h4>
            <Badge variant={getScoreVariant(healthScore.relationshipScore)}>
              {getScoreLabel(healthScore.relationshipScore)}
            </Badge>
          </div>
          <Progress value={healthScore.relationshipScore} className="mb-3" />
          
          {/* NPS Score if available */}
          {client.npsScore !== null && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Promoter Score</p>
                  <p className="text-2xl font-bold mt-1">
                    {client.npsScore}
                  </p>
                </div>
                <Badge variant={getNPSVariant(client.npsScore)}>
                  {getNPSLabel(client.npsScore)}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Payment Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment ({healthScore.paymentScore}/100)
            </h4>
            <Badge variant={getScoreVariant(healthScore.paymentScore)}>
              {getScoreLabel(healthScore.paymentScore)}
            </Badge>
          </div>
          <Progress value={healthScore.paymentScore} className="mb-3" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Payment History</p>
              <p className="font-semibold text-green-600">
                100% on-time
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Outstanding</p>
              <p className="font-semibold">
                $0
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Risk Analysis */}
  {healthScore.churnRisk > 0.5 && (
    <Alert variant="destructive">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg">High Churn Risk Detected</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          This client has a {(healthScore.churnRisk * 100).toFixed(0)}% probability of churning.
        </p>
        <p className="font-medium mb-2">Reasons:</p>
        <p className="text-sm">{healthScore.churnRiskReason}</p>
        
        <div className="mt-4">
          <p className="font-medium mb-2">Recommended Actions:</p>
          <ul className="space-y-1">
            {healthScore.recommendedActions.map((action, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Button size="sm" variant="outline">
                  {action.action}
                </Button>
                <Badge variant="outline">{action.priority}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  )}

  {/* Expansion Opportunity */}
  {healthScore.expansionPotential > 0.7 && (
    <Alert className="border-green-200 bg-green-50">
      <TrendingUp className="h-5 w-5 text-green-600" />
      <AlertTitle className="text-lg text-green-900">
        Expansion Opportunity
      </AlertTitle>
      <AlertDescription className="text-green-900">
        <p className="mb-3">
          This client shows {(healthScore.expansionPotential * 100).toFixed(0)}% 
          likelihood for expansion/upsell.
        </p>
        <Button className="mt-2 bg-green-600 hover:bg-green-700">
          Create Expansion Proposal
        </Button>
      </AlertDescription>
    </Alert>
  )}

  {/* Health History Chart */}
  <Card>
    <CardHeader>
      <CardTitle>Health Score Trend</CardTitle>
      <CardDescription>Last 90 days</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={healthHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="overall" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="engagement" 
            stroke="hsl(var(--blue))" 
            strokeWidth={1}
          />
          <Line 
            type="monotone" 
            dataKey="relationship" 
            stroke="hsl(var(--purple))" 
            strokeWidth={1}
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
</TabsContent>
```

---

## 7. SHARED COMPONENTS

### **Email Composer Modal**
```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  to?: string;
  subject?: string;
  leadId?: string;
  clientId?: string;
}

export function EmailComposer({
  open,
  onClose,
  to,
  subject,
  leadId,
  clientId
}: EmailComposerProps) {
  const [formData, setFormData] = useState({
    to: to || "",
    subject: subject || "",
    body: "",
  });

  const sendEmail = api.sync.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      onClose();
    },
  });

  const handleSend = () => {
    sendEmail.mutate({
      ...formData,
      leadId,
      clientId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Write your message..."
              rows={10}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sendEmail.isLoading}>
              {sendEmail.isLoading ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### **Notes Section Component**
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Pin, Trash2 } from "lucide-react";

export function NotesSection({ leadId, notes }) {
  const [newNote, setNewNote] = useState("");
  
  const createNote = api.crmLead.createNote.useMutation({
    onSuccess: () => {
      setNewNote("");
      utils.crmLead.getNotes.invalidate({ leadId });
    },
  });

  const pinNote = api.crmLead.pinNote.useMutation();
  const deleteNote = api.crmLead.deleteNote.useMutation();

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <Card>
        <CardContent className="p-4">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="mb-3"
          />
          <Button
            onClick={() => createNote.mutate({ leadId, content: newNote })}
            disabled={!newNote.trim() || createNote.isLoading}
          >
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.map((note) => (
          <Card key={note.id} className={note.isPinned ? "border-primary" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {note.user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{note.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(note.createdAt)} ago
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => pinNote.mutate({ noteId: note.id, isPinned: !note.isPinned })}
                  >
                    <Pin className={cn("h-4 w-4", note.isPinned && "fill-current")} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteNote.mutate({ noteId: note.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## COLOR SYSTEM & THEMING

### Health Score Colors:
```typescript
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  if (score >= 20) return "text-orange-500";
  return "text-red-600";
}

export function getHealthColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-green-50 text-green-600";
  if (score >= 40) return "bg-amber-50 text-amber-700";
  if (score >= 20) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-700";
}

export function getHealthStrokeColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  if (score >= 20) return "text-orange-500";
  return "text-red-600";
}
```

### Lead Score Colors:
```typescript
export function getScoreBadgeVariant(score: number) {
  if (score >= 80) return "default"; // Green/Primary
  if (score >= 50) return "secondary"; // Amber
  return "outline"; // Gray
}
```

### Sentiment Colors:
```typescript
export function getSentimentBadge(sentiment: number) {
  if (sentiment > 0.3) return "default"; // Positive - green
  if (sentiment > -0.3) return "secondary"; // Neutral - gray
  return "destructive"; // Negative - red
}
```

---

## RESPONSIVE DESIGN RULES

### Desktop (>= 1024px):
- Grid layout: 4 columns for metric cards
- Kanban columns: Show all stages side-by-side
- Client cards: 3-4 per row
- Sidebar: Sticky position

### Tablet (768px - 1023px):
- Grid layout: 2 columns for metric cards
- Kanban: Horizontal scroll with snap
- Client cards: 2 per row
- Sidebar: Collapsible

### Mobile (< 768px):
- Grid layout: 1 column (stack vertically)
- Kanban: Tab-based view (one stage at a time)
- Client cards: 1 per row (full width)
- Sidebar: Full-screen drawer
- Reduce padding/margins
- Hide less critical info
- Make CTA buttons full-width

---

## ACCESSIBILITY REQUIREMENTS

1. **Keyboard Navigation:**
   - All interactive elements must be keyboard accessible
   - Logical tab order
   - Visible focus indicators
   - Keyboard shortcuts for common actions (Cmd+K for search, etc.)

2. **Screen Readers:**
   - Proper ARIA labels on all icons and buttons
   - Descriptive alt text for images/avatars
   - Status announcements for async actions

3. **Color Contrast:**
   - WCAG AA compliance minimum (4.5:1 for text)
   - Don't rely solely on color to convey information
   - Include text labels with color indicators

4. **Touch Targets:**
   - Minimum 44x44px on mobile
   - Adequate spacing between clickable elements

---

## PERFORMANCE OPTIMIZATIONS

1. **Virtualization:**
   - Use react-window for long lists (>100 items)
   - Infinite scroll for activity feeds

2. **Lazy Loading:**
   - Code-split routes
   - Lazy load heavy components (charts, modals)
   - Image lazy loading with blur placeholders

3. **Optimistic Updates:**
   - Update UI immediately for actions
   - Revert on error
   - Use TanStack Query's optimistic updates

4. **Caching:**
   - Aggressive caching with stale-while-revalidate
   - Cache health scores (recalculate daily)
   - Prefetch on hover for details pages

---

## ANIMATION GUIDELINES

Use subtle, meaningful animations:

```typescript
// Micro-interactions
const fadeIn = "animate-in fade-in duration-200";
const slideIn = "animate-in slide-in-from-right duration-300";
const scaleIn = "animate-in zoom-in-95 duration-200";

// Transitions
const smooth = "transition-all duration-200 ease-in-out";
const fast = "transition-all duration-150 ease-in-out";

// Hover states
const hoverLift = "hover:translate-y-[-2px] hover:shadow-lg";
const hoverGlow = "hover:ring-2 hover:ring-primary";
```

**DO:**
- Fade in/out for modals and dropdowns
- Slide transitions for drawer/sidebar
- Scale on hover for cards
- Progress indicators for loading states

**DON'T:**
- Excessive bouncing or spinning
- Long animation durations (>500ms)
- Animations that delay user interaction

---

## FINAL IMPLEMENTATION CHECKLIST

### Phase 1: Core Pages
- [ ] CRM Dashboard with metrics
- [ ] Leads Kanban view
- [ ] Lead detail page
- [ ] Pipeline visualization
- [ ] Clients grid view
- [ ] Client 360 view

### Phase 2: Interactions
- [ ] Drag-and-drop for Kanban
- [ ] Email composer modal
- [ ] Notes section
- [ ] Activity timeline
- [ ] Search and filters

### Phase 3: Polish
- [ ] Loading states for all async operations
- [ ] Empty states with helpful CTAs
- [ ] Error handling and toasts
- [ ] Responsive design testing
- [ ] Accessibility audit
- [ ] Performance optimization

### Phase 4: Advanced Features
- [ ] Keyboard shortcuts
- [ ] Bulk actions
- [ ] Export functionality
- [ ] Advanced filtering
- [ ] Saved views/presets

---

## YOUR MISSION

Build these UI components following the specifications above. Focus on:

1. **Visual Excellence:** Modern, professional design that inspires confidence
2. **User Experience:** Intuitive flows that reduce clicks and cognitive load
3. **Data Clarity:** Information hierarchy that surfaces insights immediately
4. **Responsiveness:** Perfect experience on all devices
5. **Performance:** Fast, smooth interactions with proper loading states

Create a CRM interface that feels powerful yet effortless to use. Every interaction should feel natural, every screen should provide immediate value, and every design decision should serve the user's goal of managing relationships effectively.

Good luck! 🚀
