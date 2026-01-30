import Link from "next/link";
import { ArrowRight, CheckCircle2, BarChart3, Zap, Shield } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
              L
            </div>
            Baserow
          </div>
          <div className="flex items-center gap-4">
            <SignedOut>
              <Link
                href="/login"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md border border-primary/20"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[100px] opacity-30 rounded-full" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/20 blur-[120px] opacity-20 rounded-full" />
        </div>

        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            v1.0 is now live
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
            Never rely on <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">
              memory again.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Transform long-term visions into executable daily actions. Join
            thousands of high-achievers orchestrating their lives with Baserow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <Link
              href="/register"
              className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="h-12 px-8 rounded-full border border-border bg-background hover:bg-muted text-foreground font-medium flex items-center transition-all"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof - Optional filler for now */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-12 sm:gap-24 opacity-70 grayscale hover:grayscale-0 transition-opacity">
            {/* Placeholders for logos if needed */}
            <div className="font-bold text-xl text-muted-foreground">
              ACME Corp
            </div>
            <div className="font-bold text-xl text-muted-foreground">
              Global Ind
            </div>
            <div className="font-bold text-xl text-muted-foreground">
              TechFlow
            </div>
            <div className="font-bold text-xl text-muted-foreground">
              NextLevel
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to <br />
              <span className="text-primary">master your workflow</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop switching between five different apps. Baserow brings your
              goals, tasks, and habits into one unified system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-500" />}
              title="Focus Mode"
              description="Eliminate distractions with our purpose-built focus timer and blocking tools."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-indigo-500" />}
              title="Analytics"
              description="Visualize your productivity trends and identify your peak performance hours."
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-6 h-6 text-green-500" />}
              title="Goal Tracking"
              description="Break down annual vision goals into quarterly, monthly, and weekly actionable steps."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-blue-500" />}
              title="Private & Secure"
              description="Your data is your own. We use enterprise-grade encryption to keep your plans safe."
            />
            <FeatureCard
              icon={<ArrowRight className="w-6 h-6 text-purple-500" />}
              title="Seamless Sync"
              description="Access your Baserow from any device. Your data stays in perfect sync everywhere."
            />
            <FeatureCard
              icon={<ArrowRight className="w-6 h-6 text-pink-500" />}
              title="Smart Capture"
              description="Quickly capture ideas and tasks before they slip away, then organize them later."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl bg-linear-to-br from-primary via-indigo-600 to-purple-700 p-8 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl">
            {/* Background pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/noise.svg')]"></div>

            <div className="relative z-10 space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Ready to take control?
              </h2>
              <p className="text-lg text-primary-foreground/90 max-w-xl mx-auto">
                Join the waitlist today and get early access to the future of
                personal productivity.
              </p>
              <Link
                href="/register"
                className="inline-flex h-14 px-8 rounded-full bg-white text-primary font-bold text-lg items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
              >
                Get Started for Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-muted/20">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs">
              L
            </div>
            Baserow
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Baserow Inc. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              Twitter
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Discord
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md group">
      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
