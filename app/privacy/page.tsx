import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 lg:p-24">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 -ml-4">
          <Link href="/login" className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </Button>

        <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">Last updated: April 6, 2026</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you create an account, 
              use our services, or communicate with us. This may include your name, 
              email address, and project data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, 
              to develop new features, and to protect Baserow and our users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Security</h2>
            <p>
              We take reasonable measures to help protect information about you from loss, 
              theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at 
              support@baserowproductivity.vercel.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
