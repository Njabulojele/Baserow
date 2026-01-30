import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Column - Visuals */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-secondary text-secondary-foreground">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 left-10 w-[500px] h-[500px] rounded-full bg-purple-400 blur-3xl" />
        </div>

        <div className="relative z-10 transition-transform duration-700 hover:scale-105 origin-top-left">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
            <div className="w-8 h-8 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
              L
            </div>
            Baserow
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight mb-6 animate-in slide-in-from-bottom-8 duration-700">
            Build Systems That Execute.
          </h1>
          <p className="text-xl text-secondary-foreground/90 leading-relaxed theme-transition animate-in slide-in-from-bottom-8 duration-700 delay-100">
            Don't just plan. Achieve. Join the platform designed for agencies,
            freelancers, and high achievers who demand excellence.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-secondary-foreground/60">
          <p>© 2026 Baserow Inc.</p>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-12 relative">
        <div className="absolute top-8 right-8 lg:hidden">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter text-secondary">
            <div className="w-8 h-8 rounded bg-secondary text-white flex items-center justify-center">
              L
            </div>
            Baserow
          </div>
        </div>

        <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Create an account
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start your journey to complete life orchestration.
            </p>
          </div>

          <SignUpForm />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
