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
import { trpc } from "@/lib/trpc/client";

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

  const filteredModels = useMemo(() => {
    if (!availableModels) return [];
    return availableModels.filter((m: { id: string; name: string }) => {
      const isGemini = m.id.toLowerCase().includes("gemini");
      return provider === "GEMINI" ? isGemini : !isGemini;
    });
  }, [availableModels, provider]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-wider">
            Retry Analysis
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-mono">
            Re-run on collected data with a different provider.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Provider
            </Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-background border-border text-foreground font-mono text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="GROQ" className="font-mono text-xs">
                  Groq (Speed)
                </SelectItem>
                <SelectItem value="GEMINI" className="font-mono text-xs">
                  Google Gemini
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Model <span className="text-muted-foreground/40">(optional)</span>
            </Label>
            <Select
              value={model}
              onValueChange={setModel}
              disabled={!availableModels}
            >
              <SelectTrigger className="bg-background border-border text-foreground font-mono text-xs h-9">
                <SelectValue placeholder="Auto-select" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                {filteredModels.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                    className="font-mono text-xs"
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-alabaster hover:bg-charcoal h-8 text-xs font-mono"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-blu/10 hover:bg-blu/20 text-blu border border-blu/20 h-8 text-xs font-mono px-4"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-1.5" />
            )}
            START
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
