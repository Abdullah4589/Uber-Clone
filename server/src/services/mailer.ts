import nodemailer from 'nodemailer';

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

export const emailEnabled = !!(user && pass);

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  : null;

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  if (!transporter) {
    console.log(`[mailer] no credentials — reset code for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"RideShare PK" <${user}>`,
    to,
    subject: 'Your RideShare PK password reset code',
    text: `Your password reset code is: ${code}\n\nExpires in 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;background:#1a1a1a;color:#f0f0f0;border-radius:12px">
        <div style="text-align:center;font-size:36px;margin-bottom:8px">🛺</div>
        <h1 style="text-align:center;font-size:22px;font-weight:800;margin:0 0 4px">RideShare PK</h1>
        <p style="text-align:center;color:#888;font-size:13px;margin:0 0 28px">Password Reset</p>
        <p style="font-size:14px;color:#ccc;margin:0 0 16px">
          Use the code below to reset your password. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#2a2a2a;border:1px solid #FF7A1A44;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#FF7A1A">
            ${code}
          </span>
        </div>
        <p style="font-size:12px;color:#666;text-align:center;margin:0">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
