package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"anchor-backend/internal/auth"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TRPCBatchResult is the shape of each item in the batch response array.
type TRPCBatchResult struct {
	Result TRPCResult `json:"result"`
}

type TRPCResult struct {
	Data TRPCData `json:"data"`
}

type TRPCData struct {
	JSON interface{} `json:"json"`
}

// TRPCErrorResult is returned when a procedure fails.
type TRPCErrorResult struct {
	Error TRPCError `json:"error"`
}
type TRPCError struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
}

type HandlerContext struct {
	DB       *pgxpool.Pool
	Verifier *auth.ClerkVerifier
}

// HandleTRPCBatch is mounted at /api/trpc/ and handles all tRPC batch calls.
func HandleTRPCBatch(hc *HandlerContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Auth — always succeeds with dev_user fallback
		userID, orgID, _ := hc.Verifier.VerifyRequest(r)
		if userID == "" {
			userID = "dev_user"
		}

		// Extract procedure name(s) from the path
		path := r.URL.Path
		path = strings.TrimPrefix(path, "/api/trpc/")
		procedures := strings.Split(path, ",")

		// Parse input(s)
		inputs := parseBatchInputs(r, len(procedures))

		results := make([]interface{}, len(procedures))
		var wg sync.WaitGroup
		wg.Add(len(procedures))

		for i, proc := range procedures {
			go func(idx int, p string) {
				defer wg.Done()
				p = strings.TrimSpace(p)
				data, err := dispatchProcedure(r, hc, p, userID, orgID, inputs[idx])
				if err != nil {
					results[idx] = TRPCErrorResult{
						Error: TRPCError{Message: err.Error(), Code: -32000},
					}
				} else {
					results[idx] = TRPCBatchResult{
						Result: TRPCResult{Data: TRPCData{JSON: data}},
					}
				}
			}(i, proc)
		}
		wg.Wait()

		json.NewEncoder(w).Encode(results)
	}
}

// parseBatchInputs decodes the tRPC batch input format.
func parseBatchInputs(r *http.Request, count int) []map[string]interface{} {
	results := make([]map[string]interface{}, count)

	var rawInputs map[string]map[string]interface{}

	if r.Method == http.MethodGet {
		inputStr := r.URL.Query().Get("input")
		if inputStr != "" {
			decoded, _ := url.QueryUnescape(inputStr)
			json.Unmarshal([]byte(decoded), &rawInputs)
		}
	} else {
		var body map[string]map[string]interface{}
		json.NewDecoder(r.Body).Decode(&body)
		rawInputs = body
	}

	for i := 0; i < count; i++ {
		key := strconv.Itoa(i)
		if rawInputs != nil {
			if entry, ok := rawInputs[key]; ok {
				if jsonData, ok := entry["json"]; ok {
					if jsonData == nil {
						results[i] = nil
					} else if m, ok := jsonData.(map[string]interface{}); ok {
						results[i] = m
					}
				}
			}
		}
		if results[i] == nil {
			results[i] = map[string]interface{}{}
		}
	}

	return results
}

// dispatchProcedure routes to the right handler function.
func dispatchProcedure(r *http.Request, hc *HandlerContext, proc, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	ctx := r.Context()

	switch proc {
	// ── Projects ────────────────────────────────────────────
	case "project.getProjects":
		return GetProjects(ctx, hc.DB, userID, orgID, input)
	case "project.getProject":
		return GetProject(ctx, hc.DB, userID, orgID, input)
	case "project.createProject":
		return CreateProject(ctx, hc.DB, userID, orgID, input)
	case "project.updateProject":
		return UpdateProject(ctx, hc.DB, userID, orgID, input)
	case "project.deleteProject":
		return DeleteProject(ctx, hc.DB, userID, orgID, input)
	case "project.getProjectStats":
		return GetProjectStats(ctx, hc.DB, userID, orgID, input)

	// ── Tasks ────────────────────────────────────────────────
	case "task.getTasks":
		return GetTasks(ctx, hc.DB, userID, orgID, input)
	case "task.getTask":
		return GetTask(ctx, hc.DB, userID, orgID, input)
	case "task.createTask":
		return CreateTask(ctx, hc.DB, userID, orgID, input)
	case "task.updateTask":
		return UpdateTask(ctx, hc.DB, userID, orgID, input)
	case "task.deleteTask":
		return DeleteTask(ctx, hc.DB, userID, orgID, input)
	case "task.completeTask":
		return CompleteTask(ctx, hc.DB, userID, orgID, input)
	case "task.getTodaysTasks":
		return GetTodaysTasks(ctx, hc.DB, userID, orgID)
	case "task.getActiveTimer":
		return GetActiveTimer(ctx, hc.DB, userID)
	case "task.startTimer":
		return StartTimer(ctx, hc.DB, userID, input)
	case "task.stopTimer":
		return StopTimer(ctx, hc.DB, userID, input)

	// ── Clients ──────────────────────────────────────────────
	case "clients.getClients":
		return GetClients(ctx, hc.DB, userID, orgID, input)
	case "clients.getClient":
		return GetClient(ctx, hc.DB, userID, orgID, input)
	case "clients.createClient":
		return CreateClient(ctx, hc.DB, userID, orgID, input)

	// ── Communications ───────────────────────────────────────
	case "communication.getCommunications":
		return GetCommunications(ctx, hc.DB, userID, input)
	case "communication.createCommunication":
		return CreateCommunication(ctx, hc.DB, userID, input)

	// ── Habits / Goals ───────────────────────────────────────
	case "habit.getPillars":
		return GetPillars(ctx, hc.DB, userID)
	case "habit.getDailyChecklist":
		return GetDailyChecklist(ctx, hc.DB, userID, input)
	case "habit.getStreaks":
		return GetStreaks(ctx, hc.DB, userID)
	case "habit.toggleHabit":
		return ToggleHabit(ctx, hc.DB, userID, input)
	case "habit.seedDefaults":
		return SeedDefaults(ctx, hc.DB, userID)

	// ── Analytics ────────────────────────────────────────────
	case "analytics.getDashboardStats":
		return GetDashboardStats(ctx, hc.DB, userID, orgID)
	case "analytics.getTaskStats":
		return GetTaskStats(ctx, hc.DB, userID, orgID, input)
	case "analytics.getRevenueOverview":
		return GetRevenueOverview(ctx, hc.DB, userID, orgID)
	case "analytics.getProductivityTrends":
		return GetProductivityTrends(ctx, hc.DB, userID, orgID, input)
	case "analytics.getWeeklyInsights":
		return GetWeeklyInsights(ctx, hc.DB, userID)
	case "analytics.getTaskHeatmap":
		return GetTaskHeatmap(ctx, hc.DB, userID)
	case "analytics.getGoalProgressStats":
		return GetGoalProgressStats(ctx, hc.DB, userID)
	case "analytics.getTaskCompletionTrends":
		return GetTaskCompletionTrends(ctx, hc.DB, userID, input)
	case "analytics.getProjectDistribution":
		return GetProjectDistribution(ctx, hc.DB, userID)
	case "analytics.getTimeBreakdown":
		return GetTimeBreakdown(ctx, hc.DB, userID)
	case "analytics.getInactivityAlerts":
		return GetInactivityAlerts(ctx, hc.DB, userID)
	case "analytics.getGoalStats":
		return GetAnalyticsGoalStats(ctx, hc.DB, userID)

	// ── Notifications ────────────────────────────────────────
	case "notification.getUnreadCount":
		return GetUnreadNotificationCount(ctx, hc.DB, userID)
	case "notification.getRecent":
		return GetRecentNotifications(ctx, hc.DB, userID)
	case "notification.getNotifications":
		return GetNotifications(ctx, hc.DB, userID, input)
	case "notification.markAllRead":
		return MarkAllNotificationsRead(ctx, hc.DB, userID)

	// ── Goals ────────────────────────────────────────────────
	case "goals.list":
		return GetGoals(ctx, hc.DB, userID)
	case "goals.create":
		return CreateGoal(ctx, hc.DB, userID, input)
	case "goals.update":
		return UpdateGoal(ctx, hc.DB, userID, input)
	case "goals.toggle":
		return ToggleGoalCompletion(ctx, hc.DB, userID, input)
	case "goals.logSession":
		return LogGoalSession(ctx, hc.DB, userID, input)
	case "goals.delete":
		return DeleteGoal(ctx, hc.DB, userID, input)
	case "timer.logSession":
		return LogTimerSession(ctx, hc.DB, userID, input)

	// ── Calendar ─────────────────────────────────────────────
	case "calendar.getEvents":
		return GetCalendarEvents(ctx, hc.DB, userID, input)

	// ── Strategy ─────────────────────────────────────────────
	case "strategy.getYearPlan":
		return GetYearPlan(ctx, hc.DB, userID, input)
	case "strategy.getQuarterPlan":
		return GetQuarterPlan(ctx, hc.DB, userID, input)
	case "strategy.getGoal":
		return GetGoal(ctx, hc.DB, userID, input)
	case "strategy.updateGoal":
		return UpdateGoal(ctx, hc.DB, userID, input)
	case "strategy.createKeyStep":
		return CreateKeyStep(ctx, hc.DB, userID, input)
	case "strategy.updateKeyStep":
		return UpdateKeyStep(ctx, hc.DB, userID, input)
	case "strategy.deleteKeyStep":
		return DeleteKeyStep(ctx, hc.DB, userID, input)
	case "strategy.updateMilestone":
		return UpdateMilestone(ctx, hc.DB, userID, input)

	// ── Team ─────────────────────────────────────────────────
	case "team.getOrganization":
		return GetOrganization(ctx, hc.DB, userID)
	case "team.createOrganization":
		return CreateOrganization(ctx, hc.DB, userID, input)

	// ── CRM ──────────────────────────────────────────────────
	case "crmLead.getStats":
		return GetCRMLeadStats(ctx, hc.DB, userID)
	case "crmLead.getByStatus":
		return GetCRMLeadsByStatus(ctx, hc.DB, userID)
	case "crmLead.create":
		return CreateCRMLead(ctx, hc.DB, userID, input)
	case "crmLead.update":
		return UpdateCRMLeadStatus(ctx, hc.DB, userID, input)
	case "crmLead.convertToClient":
		return ConvertCRMLeadToClient(ctx, hc.DB, userID, input)
	case "deal.getStats":
		return GetDealStats(ctx, hc.DB, userID, input)
	case "clientHealth.getSummary":
		return GetClientHealthSummary(ctx, hc.DB, userID)
	case "clientHealth.listAtRisk":
		return ListAtRiskClients(ctx, hc.DB, userID)
	case "crmActivity.list":
		return ListCRMActivities(ctx, hc.DB, userID, input)

	// ── Canvas ────────────────────────────────────────────────
	case "canvas.list":
		return ListCanvas(ctx, hc.DB, userID)
	case "canvas.getById":
		return GetCanvasById(ctx, hc.DB, userID, input)
	case "canvas.create":
		return CreateCanvas(ctx, hc.DB, userID, input)
	case "canvas.update":
		return UpdateCanvas(ctx, hc.DB, userID, input)
	case "canvas.delete":
		return DeleteCanvas(ctx, hc.DB, userID, input)
	case "canvas.duplicate":
		return DuplicateCanvas(ctx, hc.DB, userID, input)
	case "canvas.toggleFavorite":
		return ToggleCanvasFavorite(ctx, hc.DB, userID, input)

	// ── Prospecting ───────────────────────────────────────────
	case "prospecting.getAgents":
		return GetProspectingAgents(ctx, hc.DB, userID)
	case "prospecting.getLeads":
		return GetProspectingLeads(ctx, hc.DB, userID, input)
	case "prospecting.toggleAgent":
		return ToggleProspectingAgent(ctx, hc.DB, userID, input)
	case "prospecting.deleteAgent":
		return DeleteProspectingAgent(ctx, hc.DB, userID, input)
	case "prospecting.triggerRun":
		return TriggerProspectingRun(ctx, hc.DB, userID, input)
	case "prospecting.markContacted":
		return MarkProspectingContacted(ctx, hc.DB, userID, input)

	// ── Research ──────────────────────────────────────────────
	case "research.list":
		return ListResearch(ctx, hc.DB, userID, input)
	case "research.getById":
		return GetResearchById(ctx, hc.DB, userID, input)
	case "research.create":
		return CreateResearch(ctx, hc.DB, userID, input)
	case "research.refinePrompt":
		return RefineResearchPrompt(ctx, hc.DB, userID, input)
	case "research.startResearch":
		return StartResearch(ctx, hc.DB, userID, input)
	case "research.cancelResearch":
		return CancelResearch(ctx, hc.DB, userID, input)
	case "research.delete":
		return DeleteResearch(ctx, hc.DB, userID, input)
	case "research.toggleFavorite":
		return ToggleResearchFavorite(ctx, hc.DB, userID, input)

	// ── Wellbeing ─────────────────────────────────────────────
	case "wellbeing.getDailyLog":
		return GetWellbeingDailyLog(ctx, hc.DB, userID, input)
	case "wellbeing.saveLog":
		return SaveWellbeingLog(ctx, hc.DB, userID, input)
	case "wellbeing.getStats":
		return GetWellbeingStats(ctx, hc.DB, userID)

	// ── Planning ──────────────────────────────────────────────
	case "planning.getDayPlan":
		return GetDayPlan(ctx, hc.DB, userID, input)
	case "planning.saveDayPlan":
		return SaveDayPlan(ctx, hc.DB, userID, input)

	// ── Settings ──────────────────────────────────────────────
	case "settings.get":
		return GetUserSettings(ctx, hc.DB, userID)
	case "settings.update":
		return UpdateUserSettings(ctx, hc.DB, userID, input)

	default:
		// Gracefully return empty object instead of error for unmapped procedures
		return map[string]interface{}{}, nil
	}
}
