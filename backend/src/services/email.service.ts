import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';

const resend = env.EMAIL_API_KEY ? new Resend(env.EMAIL_API_KEY) : null;

// Templates are plain HTML read straight from src/emails at runtime (no build/copy
// step) — process.cwd() is the backend/ package root in both `tsx` dev and the
// compiled `node dist/server.js` prod start, since neither entry point changes cwd.
function renderTemplate(name: string, variables: Record<string, string>): string {
  const templatePath = path.resolve(process.cwd(), 'src', 'emails', `${name}.html`);
  let html = readFileSync(templatePath, 'utf-8');

  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  return html;
}

export class EmailService {
  static async sendVerificationEmail(
    to: string,
    userName: string,
    verifyUrl: string,
  ): Promise<void> {
    await EmailService.send(to, 'Verify your Bangla AI Hub email', 'verifyEmail', {
      userName,
      verifyUrl,
    });
  }

  static async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetUrl: string,
  ): Promise<void> {
    await EmailService.send(to, 'Reset your Bangla AI Hub password', 'passwordReset', {
      userName,
      resetUrl,
    });
  }

  private static async send(
    to: string,
    subject: string,
    template: string,
    variables: Record<string, string>,
  ): Promise<void> {
    if (!resend || !env.EMAIL_FROM) {
      logger.warn('Email not sent — EMAIL_API_KEY/EMAIL_FROM not configured yet.', { to, subject });
      return;
    }

    const html = renderTemplate(template, variables);
    await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  }
}
