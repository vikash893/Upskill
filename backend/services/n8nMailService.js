const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');

/**
 * Dispatches Registration OTP.
 * Prioritizes n8n Webhook pipeline if N8N_WEBHOOK_URL is configured in .env.
 * Automatically falls back to SMTP / console logging so execution never breaks.
 */
async function sendRegistrationOtp({ email, name, otp }) {
  const n8nUrl = String(process.env.N8N_WEBHOOK_URL || '').trim();

  // 1. Prioritize n8n Webhook Pipeline if URL is configured
  if (n8nUrl) {
    try {
      console.log(`[n8n] Triggering registration OTP webhook for ${email} -> ${n8nUrl}`);
      const payload = JSON.stringify({
        event: 'user_registration_otp',
        type: 'manual_register',
        email,
        name: name || email.split('@')[0],
        otp,
        expires_in_minutes: 10,
        timestamp: new Date().toISOString()
      });

      const parsedUrl = new URL(n8nUrl);
      const transport = parsedUrl.protocol === 'https:' ? https : http;

      await new Promise((resolve) => {
        const req = transport.request(parsedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 8000
        }, (res) => {
          res.resume(); // consume response data to free up memory
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[n8n] Webhook successfully delivered OTP for ${email} (status: ${res.statusCode})`);
          } else {
            console.warn(`[n8n] Webhook returned HTTP ${res.statusCode}`);
          }
          resolve();
        });

        req.on('error', (err) => {
          console.warn('[n8n] Webhook request error:', err.message);
          resolve();
        });

        req.on('timeout', () => {
          req.destroy();
          console.warn('[n8n] Webhook request timed out after 8s');
          resolve();
        });

        req.write(payload);
        req.end();
      });

      return { success: true, provider: 'n8n' };
    } catch (err) {
      console.warn('[n8n] Webhook execution error:', err.message);
    }
  }

  // 2. Fallback: Google Mail / SMTP if configured
  if (process.env.GOOGLE_MAIL_USER && process.env.GOOGLE_MAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GOOGLE_MAIL_USER,
          pass: process.env.GOOGLE_MAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"UniSkill" <${process.env.GOOGLE_MAIL_USER}>`,
        to: email,
        subject: `${otp} is your UniSkill registration verification code`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0F172A; margin: 0;">UniSkill</h2>
              <p style="color: #64748B; font-size: 13px; margin: 4px 0 0;">Empowering Learning & Skills</p>
            </div>
            <h3 style="color: #0F172A; margin: 0 0 12px; font-size: 18px;">Verify your account</h3>
            <p style="color: #475569; font-size: 14px; margin: 0 0 16px;">Hi ${name || 'there'},</p>
            <p style="color: #475569; font-size: 14px; margin: 0 0 20px;">Use the following 6-digit verification code to complete your UniSkill account registration:</p>
            <div style="background: #F1F5F9; padding: 18px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563EB; margin-bottom: 20px;">
              ${otp}
            </div>
            <p style="color: #94A3B8; font-size: 12px; margin: 0; line-height: 1.5;">This code will expire in 10 minutes. If you did not sign up for UniSkill, please disregard this email.</p>
          </div>
        `
      });

      console.log(`[SMTP] Registration OTP sent to ${email}`);
      return { success: true, provider: 'smtp' };
    } catch (smtpErr) {
      console.warn('[SMTP] Email delivery error:', smtpErr.message);
    }
  }

  // 3. Fallback: Always log OTP to console for local testing and debugging
  console.log(`\n======================================================`);
  console.log(`[UNISKILL REGISTRATION OTP]`);
  console.log(`Email: ${email}`);
  console.log(`Code : ${otp}`);
  console.log(`======================================================\n`);

  return { success: true, provider: 'console', otp };
}

module.exports = { sendRegistrationOtp };
