import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Column - Visuals */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-primary text-primary-foreground">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-indigo-400 blur-3xl" />
        </div>

        <div className="relative z-10 transition-transform duration-700 hover:scale-105 origin-top-left">
          <div className="flex items-center gap-2.5 text-2xl font-bold tracking-tighter leading-none">
            <div className="relative top-[1px]">
              <Image src="/logo.png" alt="Baserow" width={32} height={32} />
            </div>
            Baserow
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight mb-6 animate-in slide-in-from-bottom-8 duration-700">
            Never rely on memory again.
          </h1>
          <p className="text-xl text-primary-foreground/90 leading-relaxed theme-transition animate-in slide-in-from-bottom-8 duration-700 delay-100">
            Transform long-term visions into executable daily actions. Join
            thousands of high-achievers orchestrating their lives with Baserow.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-primary-foreground/60">
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
        <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
          {/* Mobile Logo & Welcome */}
          <div className="text-center lg:text-left">
            <div className="flex lg:hidden items-center justify-center gap-2 mb-8 text-2xl font-bold tracking-tighter text-primary leading-none">
              <div className="relative top-[1px]">
                <Image
                  src="/logo.png"
                  alt="Baserow"
                  width={32}
                  height={32}
                  className="rounded"
                />
              </div>
              Baserow
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-muted-foreground">
              Enter your credentials to access your workspace.
            </p>
          </div>

          <SignInForm />

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
