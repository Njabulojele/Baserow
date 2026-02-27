import { Resend } from "resend";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  /**
   * Send an email using the configured provider.
   * Defaults to console logging if no provider is configured.
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text, from } = options;
    const fromAddress =
      from || process.env.EMAIL_FROM || "noreply@crm-system.com"; // Replace with verified domain when going to production

    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: fromAddress,
          to: typeof to === "string" ? [to] : to,
          subject,
          html,
          text,
        });

        if (error) {
          console.error("[EmailService] Resend API Error:", error);
          return false;
        }

        console.log(
          `[EmailService] Successfully sent email to ${to} via Resend`,
        );
        return true;
      } catch (err) {
        console.error("[EmailService] Failed to send email via Resend:", err);
        return false;
      }
    }

    // For now, simulate sending if Resend is not configured
    console.warn(
      "[EmailService] WARNING: RESEND_API_KEY is not set. Simulating email delivery.",
    );
    console.log("---------------------------------------------------");
    console.log(`[EmailService] Sending Email`);
    console.log(`From: ${fromAddress}`);
    console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body Fragment: ${html.substring(0, 80)}...`);
    console.log("---------------------------------------------------");

    return true;
  }
}
