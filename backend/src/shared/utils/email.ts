import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";

let transporter: Transporter | null = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<boolean> {
  const subject = "Your SkoolNova ERP Password Reset OTP";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">SkoolNova ERP</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Institutional Campus Management</p>
      </div>
      <div style="padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; text-align: center;">
        <p style="color: #334155; font-size: 14px; margin-top: 0;">We received a request to reset your password. Use the following 6-digit OTP to complete your verification:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; padding: 14px 0; background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
      </div>
      <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 11px;">
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <p style="margin-top: 8px;">© ${new Date().getFullYear()} SkoolNova ERP • A Product of Code-A-Nova</p>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"SkoolNova Security" <${process.env.SMTP_USER || "codeanova26@gmail.com"}>`,
        to: email,
        subject,
        html,
      });
      console.log(`[Email] Password reset OTP sent to ${email}`);
      return true;
    } catch (err: any) {
      console.error(`[Email Error] Failed to send email to ${email}:`, err.message);
    }
  }

  // Fallback log for development / console verification
  console.log(`\n==================================================`);
  console.log(`🔐 [PASSWORD RESET OTP]`);
  console.log(`Recipient: ${email}`);
  console.log(`OTP Code : ${otp}`);
  console.log(`Validity : 10 minutes`);
  console.log(`==================================================\n`);

  return true;
}
