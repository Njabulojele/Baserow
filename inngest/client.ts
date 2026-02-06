import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "baserow-research",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
