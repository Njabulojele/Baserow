interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  /**
   * Send an email using the configured provider.
   * Defaults to console logging if no provider is configured.
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, from } = options;
    const fromAddress =
      from || process.env.EMAIL_FROM || "noreply@crm-system.com";

    // TODO: Implement actual providers (Resend, SendGrid, SMTP)
    if (process.env.RESEND_API_KEY) {
      // return this.sendViaResend(options);
    }

    // For now, simulate sending
    console.log("---------------------------------------------------");
    console.log(`[EmailService] Sending Email`);
    console.log(`From: ${fromAddress}`);
    console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body Fragment: ${html.substring(0, 50)}...`);
    console.log("---------------------------------------------------");

    return true;
  }
}
