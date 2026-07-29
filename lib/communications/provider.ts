import "server-only";

export type EmailMessage = {
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  to: string[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type EmailSendResult = {
  accepted: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface EmailProviderAdapter {
  testConnection(): Promise<{ connected: boolean; error?: string }>;
  sendTestEmail(message: EmailMessage): Promise<EmailSendResult>;
  sendTransactionalEmail(message: EmailMessage): Promise<EmailSendResult>;
  sendCampaignEmail(message: EmailMessage): Promise<EmailSendResult>;
  getProviderStatus(fromEmail?: string): Promise<{ connected: boolean; verificationStatus: string; error?: string }>;
  validateSenderConfiguration(message: Pick<EmailMessage, "fromName" | "fromEmail">): string[];
}

function safeProviderError(status: number) {
  if (status === 401 || status === 403) return "The provider rejected the credentials.";
  if (status === 429) return "The provider rate limit was reached. Try again later.";
  if (status >= 500) return "The email provider is temporarily unavailable.";
  return "The provider rejected the email request. Verify the sender and recipient configuration.";
}

export class ResendEmailProviderAdapter implements EmailProviderAdapter {
  constructor(private readonly apiKey: string) {}

  async testConnection() {
    try {
      const response = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        cache: "no-store"
      });
      return response.ok ? { connected: true } : { connected: false, error: safeProviderError(response.status) };
    } catch {
      return { connected: false, error: "Unable to reach the email provider." };
    }
  }

  validateSenderConfiguration(message: Pick<EmailMessage, "fromName" | "fromEmail">) {
    const errors: string[] = [];
    if (!message.fromName.trim()) errors.push("A sender name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.fromEmail)) errors.push("A valid sender email is required.");
    return errors;
  }

  private async send(message: EmailMessage): Promise<EmailSendResult> {
    const validation = this.validateSenderConfiguration(message);
    if (validation.length) return { accepted: false, error: validation[0] };
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${message.fromName} <${message.fromEmail}>`,
          to: message.to,
          reply_to: message.replyTo || undefined,
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers
        })
      });
      if (!response.ok) return { accepted: false, error: safeProviderError(response.status) };
      const result = await response.json() as { id?: string };
      return { accepted: true, providerMessageId: result.id };
    } catch {
      return { accepted: false, error: "Unable to reach the email provider." };
    }
  }

  sendTestEmail(message: EmailMessage) { return this.send(message); }
  sendTransactionalEmail(message: EmailMessage) { return this.send(message); }
  sendCampaignEmail(message: EmailMessage) { return this.send(message); }
  async getProviderStatus(fromEmail?: string) {
    try {
      const response = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        cache: "no-store"
      });
      if (!response.ok) {
        return {
          connected: false,
          verificationStatus: "failed",
          error: safeProviderError(response.status)
        };
      }
      if (!fromEmail) {
        return { connected: true, verificationStatus: "unverified" };
      }
      const payload = (await response.json()) as {
        data?: Array<{ name?: string; status?: string }>;
      };
      const senderDomain = fromEmail.split("@").at(-1)?.toLowerCase();
      const domain = payload.data?.find(
        (item) => item.name?.toLowerCase() === senderDomain
      );
      const status =
        domain?.status === "verified"
          ? "verified"
          : domain
            ? "pending"
            : "unverified";
      return {
        connected: true,
        verificationStatus: status,
        error:
          status === "verified"
            ? undefined
            : "The API key is valid, but the sender domain is not verified in Resend."
      };
    } catch {
      return {
        connected: false,
        verificationStatus: "failed",
        error: "Unable to reach the email provider."
      };
    }
  }
}
