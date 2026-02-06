interface CalendarEvent {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
}

export class CalendarService {
  /**
   * Create an event in the external calendar (Google/Outlook).
   * Defaults to console logging if no provider is configured.
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    const { summary, startTime, endTime } = event;

    // TODO: Implement Google Calendar API
    if (process.env.GOOGLE_CLIENT_ID) {
      // return this.createGoogleEvent(event);
    }

    // Simulate creation
    const eventId = `mock_evt_${Date.now()}`;
    console.log("---------------------------------------------------");
    console.log(`[CalendarService] Creating Calendar Event`);
    console.log(`Summary: ${summary}`);
    console.log(`Time: ${startTime.toISOString()} - ${endTime.toISOString()}`);
    console.log(`Event ID: ${eventId}`);
    console.log("---------------------------------------------------");

    return eventId;
  }
}
