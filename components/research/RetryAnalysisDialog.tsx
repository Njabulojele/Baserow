"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Loader2, Play } from "lucide-react";

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

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({ provider, model: model || undefined });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

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
              <SelectTrigger className="bg-black/20 border-[#2f3e46]">
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
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "GROQ"
                  ? "llama-3.3-70b-versatile"
                  : "gemini-2.0-flash"
              }
              className="bg-black/20 border-[#2f3e46]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#2f3e46] text-gray-400 hover:text-white hover:bg-[#2f3e46]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
