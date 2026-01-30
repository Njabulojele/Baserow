import { prefetch } from "@/lib/trpc/server";
import { DailyReviewForm } from "@/components/planning/DailyReviewForm";

export default async function DailyReviewPage() {
  // Prep any data needed for review (optional prefetch)
  // const data = await prefetch.dayPlan({ date: new Date() });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white-smoke">
          Daily Review
        </h1>
        <p className="text-muted-foreground mt-1">
          Reflect on your day, celebrate wins, and prepare for tomorrow.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <DailyReviewForm />
      </div>
    </div>
  );
}
