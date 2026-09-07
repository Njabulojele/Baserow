import { test, describe } from "node:test";
import assert from "node:assert";
import {
  toFullCalendarEvent,
  toFullCalendarEvents,
  extractResourcesFromEvents,
  fromFullCalendarMutation,
} from "../adapter";
import { CalendarEvent } from "@/types/calendar";

describe("FullCalendar Adapter", () => {
  const sampleEvent: CalendarEvent = {
    id: "task-101",
    title: "Client Design Review",
    start: "2026-09-07T10:00:00.000Z",
    end: "2026-09-07T11:00:00.000Z",
    type: "task",
    status: "in_progress",
    priority: "high",
    color: "#3b82f6",
    projectId: "project-alpha",
    draggable: true,
    resizable: true,
  };

  test("toFullCalendarEvent maps standard fields correctly", () => {
    const fcEvent = toFullCalendarEvent(sampleEvent);
    assert.strictEqual(fcEvent.id, "task-101");
    assert.strictEqual(fcEvent.title, "Client Design Review");
    assert.strictEqual(fcEvent.start, "2026-09-07T10:00:00.000Z");
    assert.strictEqual(fcEvent.end, "2026-09-07T11:00:00.000Z");
    assert.strictEqual(fcEvent.editable, true);
    assert.strictEqual(fcEvent.resourceId, "project-alpha");
    assert.strictEqual(fcEvent.extendedProps?.priority, "high");
    assert.strictEqual(fcEvent.extendedProps?.type, "task");
  });

  test("toFullCalendarEvent correctly handles background events", () => {
    const bgEvent: CalendarEvent = {
      id: "bg-focus",
      title: "Focus Time",
      start: "2026-09-07T08:00:00.000Z",
      end: "2026-09-07T10:00:00.000Z",
      type: "background",
      status: "scheduled",
      priority: "low",
      color: "#6366f1",
      draggable: false,
      resizable: false,
      display: "background",
    };

    const fcEvent = toFullCalendarEvent(bgEvent);
    assert.strictEqual(fcEvent.display, "background");
    assert.strictEqual(fcEvent.editable, false);
    assert.strictEqual(fcEvent.startEditable, false);
    assert.strictEqual(fcEvent.durationEditable, false);
  });

  test("extractResourcesFromEvents creates resource list including general and project items", () => {
    const resources = extractResourcesFromEvents([sampleEvent]);
    assert.strictEqual(resources.some((r) => r.id === "general"), true);
    assert.strictEqual(resources.some((r) => r.id === "project-alpha"), true);
  });

  test("fromFullCalendarMutation correctly reverses drop / resize payloads", () => {
    const fcMock = {
      id: "task-101",
      start: new Date("2026-09-07T14:00:00.000Z"),
      end: new Date("2026-09-07T15:30:00.000Z"),
      allDay: false,
      getResources: () => [{ id: "res-team-1" }],
    };

    const payload = fromFullCalendarMutation(fcMock);
    assert.strictEqual(payload.id, "task-101");
    assert.deepStrictEqual(payload.start, new Date("2026-09-07T14:00:00.000Z"));
    assert.deepStrictEqual(payload.end, new Date("2026-09-07T15:30:00.000Z"));
    assert.strictEqual(payload.resourceId, "res-team-1");
  });
});
