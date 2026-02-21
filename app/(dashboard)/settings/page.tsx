"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Settings,
  Key,
  Save,
  CheckCircle2,
  ShieldCheck,
  User,
  Globe,
  Search,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();
  const { data: models = [] } = trpc.settings.getAvailableModels.useQuery();
  const updateMutation = trpc.settings.updateSettings.useMutation();

  const handleUpdateKey = async () => {
    if (!apiKey) {
      toast.error("Please enter a valid API key");
      return;
    }

    try {
      await updateMutation.mutateAsync({ geminiApiKey: apiKey });
      setApiKey(""); // Clear input for security
      utils.settings.getSettings.invalidate();

      toast.success("API Key updated successfully", {
        description: "Your key has been encrypted and saved safely.",
      });
    } catch (error: any) {
      toast.error("Failed to update settings", {
        description: error.message,
      });
    }
  };

  const handleUpdateSerperKey = async () => {
    if (!serperKey) {
      toast.error("Please enter a valid Serper API key");
      return;
    }

    try {
      await updateMutation.mutateAsync({ serperApiKey: serperKey });
      setSerperKey("");
      utils.settings.getSettings.invalidate();

      toast.success("Serper API Key saved", {
        description: "You can now use Serper for web search.",
      });
    } catch (error: any) {
      toast.error("Failed to save Serper key", {
        description: error.message,
      });
    }
  };

  const handleUpdateGroqKey = async () => {
    if (!groqKey) {
      toast.error("Please enter a valid Groq API key");
      return;
    }

    try {
      await updateMutation.mutateAsync({ groqApiKey: groqKey });
      setGroqKey("");
      utils.settings.getSettings.invalidate();

      toast.success("Groq API Key saved", {
        description: "You can now use Groq as an LLM provider.",
      });
    } catch (error: any) {
      toast.error("Failed to save Groq key", {
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading settings...</div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#a9927d]/20 rounded-xl">
          <Settings className="w-8 h-8 text-[#a9927d]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account preferences and integrations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Sidebar (For visual structure) */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start bg-[#1a252f] text-white hover:bg-[#2f3e46]"
          >
            <Key className="w-4 h-4 mr-2" /> Integrations
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
          >
            <User className="w-4 h-4 mr-2" /> Account
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
          >
            <Globe className="w-4 h-4 mr-2" /> Preferences
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Integration Card */}
          <Card className="bg-[#1a252f] border-[#2f3e46] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  AI & Research Configuration
                </h2>
                <p className="text-sm text-gray-400">
                  Manage your LLM providers and models
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-gray-300">Default LLM Provider</Label>
                <Select
                  value={settings?.llmProvider || "GEMINI"}
                  onValueChange={(value) =>
                    updateMutation.mutate({ llmProvider: value })
                  }
                >
                  <SelectTrigger className="bg-black/20 border-[#2f3e46] h-10">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-white">
                    <SelectItem value="GEMINI">
                      Google Gemini (Recommended)
                    </SelectItem>
                    <SelectItem value="GROQ">
                      Groq (Llama 3.1 - Fast)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500">
                  Select your primary LLM for research processing. If one fails
                  (e.g. quota), the system will try to fallback.
                </p>
              </div>

              <Separator className="bg-[#2f3e46]" />

              <div className="bg-black/20 p-4 rounded-xl border border-[#2f3e46]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      Gemini API Status
                    </p>
                    <p className="text-xs text-gray-500">
                      Standard LLM provider
                    </p>
                  </div>
                  {settings?.hasGeminiKey ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#6b9080]/20 rounded-full border border-[#6b9080]/30">
                      <CheckCircle2 className="w-4 h-4 text-[#6b9080]" />
                      <span className="text-xs font-bold text-[#6b9080]">
                        CONNECTED
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                      <Key className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-500">
                        MISSING KEY
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">AI Model</Label>
                <Select
                  value={settings?.geminiModel || "gemini-2.0-flash"}
                  onValueChange={(value) =>
                    updateMutation.mutate({ geminiModel: value })
                  }
                >
                  <SelectTrigger className="bg-black/20 border-[#2f3e46] h-10">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-white">
                    {models?.map((model: any) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500">
                  Select the underlying Gemini model for research analysis.
                  "Flash" models are faster, "Pro" models are more
                  reasoning-capable.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Update API Key</Label>
                <div className="flex gap-3">
                  <Input
                    type="password"
                    placeholder={
                      settings?.hasGeminiKey
                        ? "••••••••••••••••••••••••••"
                        : "Paste your Gemini API key"
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 bg-black/20 border-[#2f3e46] focus:border-[#a9927d]"
                  />
                  <Button
                    onClick={handleUpdateKey}
                    disabled={updateMutation.isPending || !apiKey}
                    className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
                  >
                    {updateMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500">
                  Your key is encrypted using AES-256 before storage.
                </p>
              </div>

              <Separator className="bg-[#2f3e46]" />

              {/* Groq Integration Section */}
              <div className="space-y-6">
                <div className="bg-black/20 p-4 rounded-xl border border-[#2f3e46]">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        Groq API Status
                      </p>
                      <p className="text-xs text-gray-500">
                        High-speed LLM provider
                      </p>
                    </div>
                    {settings?.hasGroqKey ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-[#6b9080]/20 rounded-full border border-[#6b9080]/30">
                        <CheckCircle2 className="w-4 h-4 text-[#6b9080]" />
                        <span className="text-xs font-bold text-[#6b9080]">
                          CONNECTED
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                        <Key className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-500">
                          MISSING KEY
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-gray-300">Groq API Key</Label>
                  <div className="flex gap-3">
                    <Input
                      type="password"
                      placeholder={
                        settings?.hasGroqKey
                          ? "••••••••••••••••••••••••••"
                          : "Paste your Groq API key"
                      }
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      className="flex-1 bg-black/20 border-[#2f3e46] focus:border-[#a9927d]"
                    />
                    <Button
                      onClick={handleUpdateGroqKey}
                      disabled={updateMutation.isPending || !groqKey}
                      className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
                    >
                      {updateMutation.isPending ? (
                        "Saving..."
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Used as a fallback or for higher speed research steps.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-[#1a252f] border-[#2f3e46] text-white">
            <CardHeader>
              <CardTitle>Research Scraping Mode</CardTitle>
              <CardDescription className="text-gray-400">
                Choose how the research agent gathers information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={settings?.scrapingMode || "AGENTIC"}
                onValueChange={(val) =>
                  updateMutation.mutate({ scrapingMode: val })
                }
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="AGENTIC" id="agentic" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="agentic" className="font-bold">
                      Agentic Search (Deep & Smart)
                    </Label>
                    <p className="text-sm text-gray-400">
                      Iteratively searches, analyzes gaps, and searches again.
                      Best for complex topics. (Uses LLM)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <RadioGroupItem value="SCRAPER" id="scraper" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="scraper" className="font-bold">
                      Fast Scraper (Single Pass)
                    </Label>
                    <p className="text-sm text-gray-400">
                      fast, single-pass search & scrape. No AI "thinking" during
                      collection. Best for speed & avoiding rate limits.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Serper Integration Card */}
          <Card className="bg-[#1a252f] border-[#2f3e46] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#6b9080]/10 rounded-lg">
                <Search className="w-5 h-5 text-[#6b9080]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Web Search (Serper)
                </h2>
                <p className="text-sm text-gray-400">
                  Optional: Use Serper.dev for custom web scraping
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded-xl border border-[#2f3e46]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      Serper API Status
                    </p>
                    <p className="text-xs text-gray-500">
                      Get a free key at serper.dev
                    </p>
                  </div>
                  {settings?.hasSerperKey ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#6b9080]/20 rounded-full border border-[#6b9080]/30">
                      <CheckCircle2 className="w-4 h-4 text-[#6b9080]" />
                      <span className="text-xs font-bold text-[#6b9080]">
                        CONNECTED
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/20 rounded-full border border-gray-500/30">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-400">
                        OPTIONAL
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Serper API Key</Label>
                <div className="flex gap-3">
                  <Input
                    type="password"
                    placeholder={
                      settings?.hasSerperKey
                        ? "••••••••••••••••••••••••••"
                        : "Paste your Serper API key"
                    }
                    value={serperKey}
                    onChange={(e) => setSerperKey(e.target.value)}
                    className="flex-1 bg-black/20 border-[#2f3e46] focus:border-[#6b9080]"
                  />
                  <Button
                    onClick={handleUpdateSerperKey}
                    disabled={updateMutation.isPending || !serperKey}
                    className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white"
                  >
                    {updateMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500">
                  When creating research, select "Serper API" as search method
                  to use this.
                </p>
              </div>
            </div>
          </Card>

          {/* Account Info (Read Only for now) */}
          <Card className="bg-[#1a252f] border-[#2f3e46] p-6 opacity-80">
            <h3 className="text-lg font-semibold text-white mb-4">
              Account Overview
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-gray-500">
                    Name
                  </Label>
                  <Input
                    value={settings?.name || ""}
                    disabled
                    className="bg-black/10 border-[#2f3e46]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-gray-500">
                    Email
                  </Label>
                  <Input
                    value={settings?.email || ""}
                    disabled
                    className="bg-black/10 border-[#2f3e46]"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
