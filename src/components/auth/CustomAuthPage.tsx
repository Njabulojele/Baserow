import React, { useState } from "react";
import { useClerk } from "@clerk/react";
import {
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Loader2
} from "lucide-react";

interface CustomAuthPageProps {
  initialMode?: "sign-in" | "sign-up";
  onBackToLanding?: () => void;
}

export function CustomAuthPage({ initialMode = "sign-in", onBackToLanding }: CustomAuthPageProps) {
  const clerk = useClerk();
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "sign-in") {
        const result = await clerk.client.signIn.create({
          identifier: email,
          password: password,
        });

        if (result.status === "complete") {
          await clerk.setActive({ session: result.createdSessionId });
        } else {
          setError("Additional verification steps required for this account.");
        }
      } else {
        const result = await clerk.client.signUp.create({
          emailAddress: email,
          password: password,
        });

        if (result.status === "complete") {
          await clerk.setActive({ session: result.createdSessionId });
        } else if (result.unverifiedFields?.includes("email_address")) {
          // Send verification code
          await clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setError("Account created! Please check your email for verification code.");
        } else {
          setError("Verification required to complete signup.");
        }
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Authentication error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Custom OAuth SSO Handler
  const handleSSO = (strategy: "oauth_google" | "oauth_github") => {
    try {
      if (mode === "sign-in") {
        clerk.client.signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else {
        clerk.client.signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (err: any) {
      setError(err?.message || "SSO Redirect failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white selection:bg-white/20 selection:text-white flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      
      {/* Back Button */}
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-medium text-gray-300 hover:text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing</span>
        </button>
      )}

      {/* Main Split Auth Container */}
      <div className="w-full max-w-5xl rounded-[32px] bg-[#0b0d12] border border-white/10 overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[640px] relative z-10">
        
        {/* ── LEFT COLUMN: Dark Luxury Showcase ────────────────────────── */}
        <div className="lg:col-span-5 bg-[#0f1118] border-r border-white/10 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Baserow Logo" className="w-9 h-9 rounded-xl object-contain" />
              <span className="font-extrabold tracking-wider text-base font-mono">
                BASEROW
              </span>
            </div>

            <div className="pt-4">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
                THE HIGH-PERFORMANCE <br />
                <span className="text-white/70">SOLO FOUNDER TERMINAL.</span>
              </h2>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed font-normal">
                Sub-50ms Go backend engine, automated active window focus telemetry, and real-time revenue CRM pipeline.
              </p>
            </div>
          </div>

          {/* Capsule Graphic Asset */}
          <div className="my-auto py-6 flex justify-center relative z-10">
            <img 
              src="/baserow_capsule.png" 
              alt="Baserow Capsule Hub" 
              className="w-60 md:w-72 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Feature List */}
          <div className="relative z-10 space-y-2 pt-4 border-t border-white/10 text-xs text-gray-400 font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Go API Chi Router (Sub-50ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Neon PostgreSQL Connection Pooler</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Electron Active Window Telemetry</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: 100% Hand-Crafted Custom Form ────────────── */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between bg-[#0b0d12] relative">
          
          <div className="max-w-md mx-auto w-full my-auto space-y-8">
            
            {/* Custom Mode Tabs */}
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <button
                  type="button"
                  onClick={() => { setMode("sign-in"); setError(null); }}
                  className={`text-xs font-bold tracking-wider uppercase transition-all ${
                    mode === "sign-in"
                      ? "text-white border-b-2 border-white pb-4 -mb-4"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Sign In to Terminal
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("sign-up"); setError(null); }}
                  className={`text-xs font-bold tracking-wider uppercase transition-all ${
                    mode === "sign-up"
                      ? "text-white border-b-2 border-white pb-4 -mb-4"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                {mode === "sign-in" ? "Welcome Back to Baserow" : "Initialize Founder Account"}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {mode === "sign-in"
                  ? "Enter your credentials to access your active workspace."
                  : "Join founders optimizing daily focus and revenue execution."}
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Custom Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-gray-400 mb-1.5 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-gray-400 mb-1.5 uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-white hover:bg-gray-100 text-black text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-white/10 uppercase tracking-wider mt-6 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "sign-in" ? "Authenticate & Enter" : "Create Account & Enter"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Custom SSO Options */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="text-center text-[10px] text-gray-500 font-mono uppercase">
                Or Continue With Enterprise SSO
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSSO("oauth_google")}
                  className="py-2.5 px-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSSO("oauth_github")}
                  className="py-2.5 px-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>
            </div>

          </div>

          <div className="text-center text-[11px] text-gray-600 font-mono pt-6">
            Protected by Clerk Authentication • Enterprise 256-Bit TLS
          </div>
        </div>

      </div>
    </div>
  );
}
