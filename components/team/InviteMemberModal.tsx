"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Mail, Shield, User, Globe, X, CheckCircle2 } from "lucide-react";

export function InviteMemberModal({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [isSuccess, setIsSuccess] = useState(false);

  const inviteMutation = trpc.team.inviteMember.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      setTimeout(() => onClose(), 2000);
    },
  });

  const roles = [
    {
      id: "ADMIN",
      label: "Admin",
      desc: "Can manage members and settings",
      icon: Shield,
    },
    { id: "MEMBER", label: "Member", desc: "Can edit all content", icon: User },
    {
      id: "VIEWER",
      label: "Viewer",
      desc: "Can only view, no editing",
      icon: Globe,
    },
  ] as const;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl p-8 w-full max-w-sm flex flex-col items-center text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1">Invite Sent!</h3>
            <p className="text-white/50 text-sm">
              An email has been sent to {email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            Invite to Team
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Email Address
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-[#0f0f11] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/20"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-white/80">Role</label>
            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-[#0f0f11] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40"}`}
                    >
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium ${isSelected ? "text-emerald-400" : "text-white"}`}
                      >
                        {r.label}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate({ orgId, email, role })}
            disabled={
              !email || !email.includes("@") || inviteMutation.isLoading
            }
            className="bg-white text-black hover:bg-white/90 px-6"
          >
            {inviteMutation.isLoading ? "Sending..." : "Send Invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}
