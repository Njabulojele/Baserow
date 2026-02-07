"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Play } from "lucide-react";
import { trpc } from "@/lib/trpc/client"; // Correct import path

interface RetryAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { provider: string; model?: string }) => Promise<void>;
}

export function RetryAnalysisDialog({
  open,
  onOpenChange,
  onConfirm,
}: RetryAnalysisDialogProps) {
  const [provider, setProvider] = useState("GROQ");
  const [model, setModel] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available models
  const { data: availableModels } = trpc.settings.getAvailableModels.useQuery();

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({ provider, model: model || undefined });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter models based on selected provider
  const filteredModels = useMemo(() => {
    if (!availableModels) return [];
    return availableModels.filter((m: { id: string; name: string }) => {
      const isGemini = m.id.toLowerCase().includes("gemini");
      if (provider === "GEMINI") return isGemini;
      // For Groq, include non-Gemini models (Llama, Mixtral, Gemma, GPT-OSS, Qwen)
      return !isGemini;
    });
  }, [availableModels, provider]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#1a252f] border-[#2f3e46] text-white">
        <DialogHeader>
          <DialogTitle>Retry Analysis Phase</DialogTitle>
          <DialogDescription className="text-gray-400">
            Restart the analysis step using already collected data. You can
            switch providers if the previous one failed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">LLM Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-black/20 border-[#2f3e46] text-white">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-white">
                <SelectItem value="GROQ">
                  Groq (Recommended for Speed)
                </SelectItem>
                <SelectItem value="GEMINI">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model">
              Model Name <span className="text-gray-500">(Optional)</span>
            </Label>
            <Select
              value={model}
              onValueChange={setModel}
              disabled={!availableModels}
            >
              <SelectTrigger className="bg-black/20 border-[#2f3e46] text-white">
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-white max-h-[200px]">
                {filteredModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {provider === "GROQ"
                ? "Llama 3.3 70B is recommended for best results."
                : "Gemini 2.0 Flash is recommended."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white hover:bg-[#2f3e46] h-9 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white h-9 text-sm px-4 shadow-md transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-2" />
            )}
            Start Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
