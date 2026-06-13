import { Resend } from 'resend';

let resendClient = null;
const getResend = () => {
  if (!resendClient) {
    // Fallback to a mock key structure so the constructor does not throw
    const apiKey = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key_here'
      ? process.env.RESEND_API_KEY
      : 're_mockkey_1234567890';
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

/**
 * Send a welcome email to a newly invited user.
 * NOTE: In Resend sandbox mode, emails only deliver to the Resend account owner's address.
 * Email failures are non-blocking — callers wrap this in try/catch.
 */
export const sendWelcomeEmail = async ({ toEmail, toName, tenantName, tempPassword }) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const client = getResend();

  await client.emails.send({
    from: 'ERP System <onboarding@resend.dev>',
    to: toEmail,
    subject: `You've been invited to ${tenantName} on Rapid ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #FF540E;">Welcome to Rapid ERP</h2>
        <p>Hi ${toName},</p>
        <p>You've been invited to join <strong>${tenantName}</strong> on Rapid ERP.</p>
        <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${toEmail}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; background: #e8e8e8; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <p>You will be asked to set a new password on your first login.</p>
        <a href="${loginUrl}" style="display: inline-block; background: #FF540E; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px; font-weight: 600;">
          Login Now
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

