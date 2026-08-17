"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-300">Completing sign in...</p>
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
}
