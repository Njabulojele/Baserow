"use client";

import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldAlert } from "lucide-react";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const acceptMutation = trpc.team.acceptInvite.useMutation({
    onSuccess: () => {
      router.push("/team");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-[#a9927d]">
        Loading...
      </div>
    );

  if (!isSignedIn) {
    return <RedirectToSignIn signInFallbackRedirectUrl={`/invite/${token}`} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] p-4">
      <div className="bg-[#1a252f] border border-[#2f3e46] p-8 max-w-md w-full rounded-2xl shadow-xl space-y-6 text-center animate-in fade-in duration-500">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Invitation Error
            </h1>
            <p className="text-gray-400">{error}</p>
            <Button
              onClick={() => router.push("/team")}
              className="mt-6 w-full text-white/70 hover:text-white"
              variant="ghost"
            >
              Return to Dashboard
            </Button>
          </>
        ) : acceptMutation.isSuccess ? (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to the Team!
            </h1>
            <p className="text-gray-400">
              You have successfully joined the workspace. Redirecting...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">
              Accept Invitation
            </h1>
            <p className="text-gray-400 mb-6">
              Signed in as {user.emailAddresses[0].emailAddress}
            </p>
            <Button
              onClick={() => acceptMutation.mutate({ token })}
              disabled={acceptMutation.isPending}
              className="w-full bg-[#a9927d] text-[#1a252f] hover:bg-[#a9927d]/90 font-semibold text-lg py-6 transition-all"
            >
              {acceptMutation.isPending ? "Accepting..." : "Join Workspace"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
