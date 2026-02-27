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
        <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-2xl p-8 w-full max-w-sm flex flex-col items-center text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#1a252f] border border-[#2f3e46] flex items-center justify-center text-[#a9927d]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-mono tracking-widest uppercase text-[#a9927d] mb-1">
              Invite Sent!
            </h3>
            <p className="text-[10px] font-mono tracking-widest uppercase text-gray-500">
              An email has been sent to {email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2f3e46] bg-[#1a252f]">
          <h3 className="text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 text-[#a9927d]">
            <Mail className="w-4 h-4 text-[#a9927d]" />
            Invite to Team
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#0a0c10] text-gray-500 hover:text-[#a9927d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              Email Address
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-[#1a252f] border border-[#2f3e46] rounded-lg px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-white outline-none focus:border-[#a9927d]/50 transition-colors placeholder:text-gray-600"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              Role
            </label>
            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-[#1a252f] border-[#a9927d]/30"
                        : "bg-[#0a0c10] border-[#2f3e46] hover:border-[#a9927d]/20"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-[#0a0c10] text-[#a9927d] border border-[#a9927d]/30" : "bg-[#1a252f] text-gray-500 border border-[#2f3e46]"}`}
                    >
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[10px] font-mono uppercase tracking-widest ${isSelected ? "text-[#a9927d]" : "text-gray-400"}`}
                      >
                        {r.label}
                      </div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600 truncate">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#2f3e46] bg-[#1a252f] flex justify-end gap-3">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white uppercase tracking-widest font-mono text-[10px]"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate({ orgId, email, role })}
            disabled={
              !email || !email.includes("@") || inviteMutation.isPending
            }
            className="bg-[#0a0c10] border border-[#a9927d]/50 text-[#a9927d] hover:bg-[#a9927d] hover:text-[#0a0c10] text-[10px] font-mono uppercase tracking-widest px-6"
          >
            {inviteMutation.isPending ? "Sending..." : "Send Invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}
