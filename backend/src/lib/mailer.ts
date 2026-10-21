import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

let transporter: Transporter | null = null;

if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Gửi email. Nếu chưa cấu hình SMTP thì chỉ ghi log (môi trường dev). */
export async function sendMail(msg: MailMessage): Promise<void> {
  if (!transporter) {
    logger.info({ to: msg.to, subject: msg.subject, text: msg.text }, '📧 [DEV] Email (SMTP chưa cấu hình)');
    return;
  }
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, ...msg });
  } catch (err) {
    // Không làm hỏng request của người dùng vì lỗi email
    logger.error({ err, to: msg.to }, 'Gửi email thất bại');
  }
}
