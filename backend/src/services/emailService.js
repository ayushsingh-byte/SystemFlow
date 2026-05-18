const nodemailer = require('nodemailer');

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM || 'SystemFlow <noreply@systemflow.dev>';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

async function sendVerificationEmail(email, token, name) {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  if (!SMTP_CONFIGURED) {
    console.log(`[Email] Verify email for ${email}: ${link}`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your SystemFlow account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#06070d;color:#f4f5fa;padding:40px;border-radius:12px">
        <h2 style="margin:0 0 8px;font-size:22px">Welcome to SystemFlow, ${name || 'there'}!</h2>
        <p style="color:#b0b5c7;margin:0 0 24px">Click the button below to verify your email address.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#38bdf8,#2563eb);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Verify email</a>
        <p style="color:#6e7388;font-size:12px;margin-top:24px">Or copy this link: ${link}</p>
        <p style="color:#6e7388;font-size:12px">Link expires in 24 hours.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, token, name) {
  const link = `${BASE_URL}/reset-password.html?token=${token}`;
  if (!SMTP_CONFIGURED) {
    console.log(`[Email] Password reset for ${email}: POST /api/auth/reset-password with { token: '${token}', password: 'newpass' }`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your SystemFlow password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#06070d;color:#f4f5fa;padding:40px;border-radius:12px">
        <h2 style="margin:0 0 8px;font-size:22px">Reset your password</h2>
        <p style="color:#b0b5c7;margin:0 0 24px">Hi ${name || 'there'}, click below to choose a new password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#38bdf8,#2563eb);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Reset password</a>
        <p style="color:#6e7388;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
        <p style="color:#6e7388;font-size:12px">Or copy: ${link}</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
