import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
export const emailEnabled = !!apiKey;

const resend = apiKey ? new Resend(apiKey) : null;

// The "from" address must be from a domain verified in your Resend dashboard.
// Until you verify a domain, use Resend's shared test address — emails will
// only deliver to the address you signed up with on resend.com.
const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  if (!resend) {
    console.log(`[mailer] no RESEND_API_KEY — reset code for ${to}: ${code}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: `RideShare PK <${FROM}>`,
    to,
    subject: 'Your RideShare PK password reset code',
    text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`,
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

  if (error) throw new Error(error.message);
}
