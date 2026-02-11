import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Zap,
  Shield,
  Bot,
  Workflow,
  Heart,
} from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50 supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <Image
              src="/logo.png"
              alt="Baserow"
              width={32}
              height={32}
              className="rounded-md"
            />
            Baserow
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link
                href="/login"
                className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md border border-primary/20 active:scale-95"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[500px] bg-primary/20 blur-[80px] md:blur-[100px] opacity-30 rounded-full mix-blend-screen" />
          <div className="absolute bottom-0 right-0 w-[250px] md:w-[600px] h-[250px] md:h-[600px] bg-secondary/20 blur-[80px] md:blur-[120px] opacity-20 rounded-full mix-blend-screen" />
        </div>

        <div className="container mx-auto max-w-4xl text-center space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50 border border-accent text-accent-foreground text-xs md:text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Mobile-First Experience
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
            Never rely on <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              memory again.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 px-2">
            Transform long-term visions into executable daily actions. Join
            thousands of high-achievers orchestrating their lives with Baserow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/register"
              className="w-full sm:w-auto h-12 px-8 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto h-12 px-8 rounded-full border border-border bg-background/50 backdrop-blur-sm hover:bg-muted text-foreground font-medium flex items-center justify-center transition-all active:scale-95"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof */}
      <section className="py-8 md:py-12 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">
            TRUSTED BY INNOVATORS AT
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {["ACME Corp", "Global Ind", "TechFlow", "NextLevel"].map(
              (name) => (
                <div
                  key={name}
                  className="font-bold text-lg md:text-xl text-muted-foreground hover:text-foreground transition-colors"
                >
                  {name}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 md:py-24 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to <br />
              <span className="text-primary">master your workflow</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop switching between five different apps. Baserow brings your
              goals, tasks, and habits into one unified system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-500" />}
              title="Focus Mode"
              description="Eliminate distractions with our purpose-built focus timer and blocking tools."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-indigo-500" />}
              title="Advanced Analytics"
              description="Visualize your productivity trends and identify your peak performance hours."
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6 text-cyan-500" />}
              title="Research Agent"
              description="AI-powered research assistant that gathers and summarizes information for you."
            />
            <FeatureCard
              icon={<Workflow className="w-6 h-6 text-orange-500" />}
              title="Automated Workflows"
              description="Streamline repetitive tasks with customizable automated workflows."
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
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-16 md:py-24 px-4 bg-muted/30 border-y border-border/50"
      >
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start with a powerful foundation and upgrade when you're ready to
              scale your productivity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="relative rounded-3xl border border-border bg-card p-8 shadow-sm flex flex-col">
              <div className="mb-8">
                <h3 className="font-bold text-2xl mb-2">Starter</h3>
                <p className="text-muted-foreground">
                  Essential tools for personal organization.
                </p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <PricingItem text="Basic Task Management" />
                <PricingItem text="Goal Tracking (Up to 3)" />
                <PricingItem text="7-day History" />
                <PricingItem text="Community Support" />
              </ul>
              <Link
                href="/register"
                className="w-full h-12 rounded-xl border border-border bg-background hover:bg-muted font-bold flex items-center justify-center transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-3xl border-2 border-primary bg-card p-8 shadow-2xl shadow-primary/10 flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              </div>
              <div className="mb-8">
                <h3 className="font-bold text-2xl mb-2 text-primary">Pro</h3>
                <p className="text-muted-foreground">
                  For serious achievers and power users.
                </p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold">R430</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <PricingItem text="Everything in Starter" included />
                <PricingItem text="Unlock Analytics Dashboard" included />
                <PricingItem text="AI Research Agent (Unlimited)" included />
                <PricingItem text="Custom Workflows" included />
                <PricingItem text="Priority Support" included />
              </ul>
              <Link
                href="/api/payfast/checkout"
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg active:scale-95"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-purple-600 p-8 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl ring-1 ring-white/20">
            {/* Background pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/noise.svg')]"></div>

            <div className="relative z-10 space-y-6 md:space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Ready to take control?
              </h2>
              <p className="text-lg text-white/90 max-w-xl mx-auto">
                Join the waitlist today and get early access to the future of
                personal productivity.
              </p>
              <Link
                href="/register"
                className="inline-flex h-12 md:h-14 px-8 rounded-full bg-white text-primary font-bold text-lg items-center justify-center hover:bg-gray-100 transition-colors shadow-lg active:scale-95"
              >
                Get Started for Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-muted/20">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Image
              src="/logo.png"
              alt="Baserow"
              width={32}
              height={32}
              className="rounded-md"
            />
            Baserow
          </div>
          <div className="flex flex-col gap-2 order-3 md:order-2 text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Baserow Inc. All rights reserved.
            </p>
            <p>
              Made with{" "}
              <Heart className="w-3 h-3 text-red-500 fill-red-500 inline mx-0.5" />{" "}
              by{" "}
              <a
                href="https://pinltdco.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-foreground transition-colors"
              >
                OpenInfinity Pty Ltd
              </a>
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground order-2 md:order-3">
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
      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
        {description}
      </p>
    </div>
  );
}

function PricingItem({
  text,
  included = false,
}: {
  text: string;
  included?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-5 h-5 rounded-full ${included ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </li>
  );
}
