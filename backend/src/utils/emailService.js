import { BrevoClient } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

let brevoClient = null;

const getBrevoClient = () => {
  if (!brevoClient) {
    const apiKey = process.env.BREVO_API_KEY;
    if (apiKey && apiKey !== 'your_key_here') {
      brevoClient = new BrevoClient({ apiKey });
    }
  }
  return brevoClient;
};

/**
 * Send user invitation email using Brevo REST API or SMTP relay as fallback.
 * This function handles failures gracefully and logs appropriate structured messages.
 * 
 * @param {Object} params
 * @param {string} params.tenantName - Name of the tenant company
 * @param {string} params.userName - Name of the invited user
 * @param {string} params.email - Email of the invited user
 * @param {string} params.role - Assigned role
 * @param {string} params.temporaryPassword - Generated temporary password
 * @param {number} [params.tenantId] - Optional Tenant ID for structured logging
 * @returns {Promise<boolean>} True if the email was successfully sent, false otherwise.
 */
export const sendUserInvitationEmail = async ({
  tenantName,
  userName,
  email,
  role,
  temporaryPassword,
  tenantId
}) => {
  const logPrefix = `[EMAIL] user=${email} tenantId=${tenantId || 'unknown'}`;
  console.log(`${logPrefix} - Invite email queued`);

  const apiKey = process.env.BREVO_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@rapiderp.com';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!apiKey || apiKey === 'your_key_here') {
    console.error(`${logPrefix} - Invite email failed: BREVO_API_KEY is not configured`);
    return false;
  }

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 540px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
    }
    .header {
      background-color: #FF540E;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 18px;
      font-weight: 600;
      margin-top: 0;
      color: #0f172a;
    }
    .details {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
    }
    .detail-row {
      margin-bottom: 12px;
      display: flex;
      flex-direction: row;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-weight: 600;
      color: #64748b;
      width: 150px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #0f172a;
      word-break: break-word;
      overflow-wrap: break-word;
      flex-grow: 1;
    }
    .password-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      color: #FF540E;
    }
    .btn {
      display: inline-block;
      background-color: #FF540E;
      color: #ffffff !important;
      padding: 12px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
      margin: 8px 0 24px 0;
      box-shadow: 0 4px 6px -1px rgba(255,84,14,0.2);
    }
    .footer {
      padding: 24px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px 12px !important;
        width: auto !important;
        border-radius: 12px !important;
      }
      .header {
        padding: 24px 20px !important;
      }
      .content {
        padding: 24px 20px !important;
      }
      .footer {
        padding: 20px 20px !important;
      }
      .detail-row {
        flex-direction: column !important;
        margin-bottom: 16px !important;
      }
      .detail-label {
        width: 100% !important;
        margin-bottom: 4px !important;
      }
      .detail-value {
        width: 100% !important;
      }
      .btn {
        display: block !important;
        margin: 8px 0 16px 0 !important;
        padding: 14px 20px !important;
        box-sizing: border-box !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rapid ERP</h1>
    </div>
    <div class="content">
      <h2>Welcome to Rapid ERP</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>You have been invited to join <strong>${tenantName}</strong> on the Rapid ERP platform.</p>
      
      <div class="details">
        <div class="detail-row">
          <div class="detail-label">Company:</div>
          <div class="detail-value">${tenantName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Role:</div>
          <div class="detail-value">${role}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Login Email:</div>
          <div class="detail-value">${email}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Temporary Password:</div>
          <div class="detail-value"><span class="password-code">${temporaryPassword}</span></div>
        </div>
      </div>

      <a href="${frontendUrl}/login" class="btn" target="_blank">Login to Rapid ERP</a>

      <p style="font-size: 13px; color: #64748b;">
        For security reasons, you will be required to change your password immediately after your first login.
      </p>
    </div>
    <div class="footer">
      <p>Regards,<br><strong>Rapid ERP Team</strong></p>
    </div>
  </div>
</body>
</html>`;

  // Check if the key is an SMTP key (starts with xsmtpsib-) and send via Nodemailer
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_API_KEY;

  if (smtpUser && smtpPass && (smtpPass.startsWith('xsmtpsib-') || !apiKey.startsWith('xkeysib-'))) {
    console.log(`${logPrefix} - Using SMTP relay route`);
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"Rapid ERP" <${emailFrom}>`,
        to: email,
        subject: 'Welcome to Rapid ERP',
        html: htmlBody,
      });

      console.log(`${logPrefix} - Invite email sent via SMTP - MessageId:`, info.messageId || 'unknown');
      return true;
    } catch (smtpError) {
      console.error(`${logPrefix} - Invite email failed via SMTP - Error:`, smtpError.message || smtpError);
      // Fall through to REST API if SMTP failed
    }
  }

  // Use REST API
  console.log(`${logPrefix} - Using REST API route`);
  const client = getBrevoClient();
  if (!client) {
    console.error(`${logPrefix} - Invite email failed: BrevoClient could not be initialized`);
    return false;
  }

  try {
    const response = await client.transactionalEmails.sendTransacEmail({
      subject: 'Welcome to Rapid ERP',
      htmlContent: htmlBody,
      sender: { name: 'Rapid ERP', email: emailFrom },
      to: [{ email, name: userName }],
    });

    console.log(`${logPrefix} - Invite email sent via REST - MessageId:`, response.messageId || 'unknown');
    return true;
  } catch (error) {
    console.error(`${logPrefix} - Invite email failed via REST - Error:`, error.message || error);
    return false;
  }
};
