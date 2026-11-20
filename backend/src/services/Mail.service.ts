import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends transactional email over SMTP when configured. Without SMTP the
 * message is logged in development so flows such as password reset can still
 * be exercised locally; nothing is logged in production.
 */
class MailService {
  private transporter?: Transporter;

  private getTransporter(): Transporter | undefined {
    if (!env.isMailConfigured) return undefined;
    this.transporter ??= nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    return this.transporter;
  }

  public async send(message: MailMessage): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      if (env.NODE_ENV === "development") logger.info({ mail: message }, "SMTP not configured; email not sent");
      else if (env.isProduction) logger.warn({ to: message.to, subject: message.subject }, "SMTP not configured; email not sent");
      return;
    }
    try {
      await transporter.sendMail({ from: env.MAIL_FROM, ...message });
    } catch (error) {
      // Email failure must not break the business operation that triggered it.
      logger.error({ err: error, subject: message.subject }, "Failed to send email");
    }
  }
}

export const mailService = new MailService();
