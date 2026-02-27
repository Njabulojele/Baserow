"use client";

import { useState, useEffect } from "react";
import {
  Flag,
  AlertTriangle,
  Plus,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "baserow-day-plan-onboarded";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Plus className="w-5 h-5 text-[#a9927d]" />,
    title: "Quick Add Tasks",
    description:
      "Use the input bar above to instantly create tasks scheduled for today.",
  },
  {
    icon: <Flag className="w-5 h-5 text-emerald-400" />,
    title: "Today's Agenda",
    description:
      "Your scheduled tasks appear in the center column. Start timers, mark them complete, and watch your Focus Score climb.",
  },
  {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    title: "Backlog & Overdue",
    description:
      "Unscheduled and overdue tasks live on the right. Drag them into your day when you're ready to commit.",
  },
  {
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    title: "Evening Review",
    description:
      "End your day with a reflection — capture wins, rate energy, and plan tomorrow. It takes 2 minutes.",
  },
];

export function DayPlanOnboarding() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#a9927d]/30 bg-gradient-to-br from-[#1a252f] via-[#1a252f] to-[#0a0c10] p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss onboarding"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep
                ? "w-6 bg-[#a9927d]"
                : i < currentStep
                  ? "w-1.5 bg-[#a9927d]/50"
                  : "w-1.5 bg-[#2f3e46]"
            }`}
          />
        ))}
        <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-gray-500">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Step content */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 p-2.5 rounded-lg bg-[#0a0c10] border border-[#2f3e46]">
          {step.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white mb-1">{step.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#2f3e46]/50">
        <button
          onClick={dismiss}
          className="text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          Skip Tour
        </button>
        <Button
          size="sm"
          onClick={nextStep}
          className="bg-[#a9927d] hover:bg-[#d4c4b7] text-[#0a0c10] font-mono tracking-widest uppercase text-[10px] h-8 px-4"
        >
          {currentStep < steps.length - 1 ? (
            <>
              Next <ArrowRight className="w-3 h-3 ml-1.5" />
            </>
          ) : (
            "Get Started"
          )}
        </Button>
      </div>
    </div>
  );
}
