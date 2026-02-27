"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { Key, Webhook, User, Globe, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { dark } from "@clerk/themes";

export default function SSOSettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-alabaster">
            Security & SSO
          </h1>
          <p className="text-gray-400 mt-1">
            Manage SAML/SCIM Enterprise SSO connections and Organization
            Members.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2 lg:sticky lg:top-8">
          <Link href="/settings" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            >
              <Key className="w-4 h-4 mr-2" /> Integrations
            </Button>
          </Link>
          <Link href="/settings/webhooks" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            >
              <Webhook className="w-4 h-4 mr-2" /> Webhooks
            </Button>
          </Link>
          <Link href="/settings/sso" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start bg-[#1a252f] text-white hover:bg-[#2f3e46]"
            >
              <ShieldCheck className="w-4 h-4 mr-2" /> Security & SSO
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            disabled
          >
            <User className="w-4 h-4 mr-2" /> Account
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            disabled
          >
            <Globe className="w-4 h-4 mr-2" /> Preferences
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {/* Clerk embeds deeply, providing organization, member mapping, and SSO domain config when enabled. */}
          <div className="w-full overflow-hidden rounded-xl border border-[#2f3e46] bg-[#121214]">
            <OrganizationProfile
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: "#a9927d",
                  colorBackground: "#1a252f",
                  colorInputBackground: "#0a0c10",
                  colorInputText: "#ffffff",
                },
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none bg-transparent border-none rounded-none m-0 p-0",
                  scrollBox: "rounded-none",
                },
              }}
              routing="hash"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
