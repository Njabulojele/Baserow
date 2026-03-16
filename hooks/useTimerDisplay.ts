"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimerStore } from "@/lib/timerStore";

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function useTimerDisplay() {
  const { isRunning, getElapsedMs } = useTimerStore();
  const [display, setDisplay] = useState("00:00:00");

  const tick = useCallback(() => {
    setDisplay(formatMs(getElapsedMs()));
  }, [getElapsedMs]);

  useEffect(() => {
    // Show current value immediately
    tick();

    if (isRunning) {
      const interval = setInterval(tick, 100);
      return () => clearInterval(interval);
    }
  }, [isRunning, tick]);

  return display;
}
