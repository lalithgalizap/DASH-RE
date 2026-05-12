/**
 * email.js — Microsoft Graph API email sender
 *
 * Uses app-only (client credentials) authentication.
 * No SMTP, no Basic Auth — works with Microsoft 365 after Basic Auth deprecation.
 *
 * Required .env variables:
 *   AZURE_TENANT_ID      — Directory (tenant) ID from Azure AD app registration
 *   AZURE_CLIENT_ID      — Application (client) ID from Azure AD app registration
 *   AZURE_CLIENT_SECRET  — Client secret value from Azure AD app registration
 *   MAIL_SENDER          — The mailbox to send FROM (e.g. pmo@zapcom.com)
 *   APP_URL              — Production app URL (e.g. https://pmo.zapcom.ai)
 */

const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');

// ── Build the Graph client once (reused across all sends) ─────────────────────
function getGraphClient() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  });

  return Client.initWithMiddleware({ authProvider });
}

const SENDER = () => process.env.MAIL_SENDER;
const APP_URL = () => process.env.APP_URL || 'https://pmo.zapcom.ai';

// ── Core send helper ──────────────────────────────────────────────────────────
async function sendMail({ to, subject, html, attachments = [] }) {
  const client = getGraphClient();

  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: (Array.isArray(to) ? to : [to]).map(addr => ({
      emailAddress: { address: addr }
    })),
  };

  // Attachments (base64-encoded)
  if (attachments.length > 0) {
    message.attachments = attachments.map(att => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.filename,
      contentType: att.contentType,
      contentBytes: Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : Buffer.from(att.content).toString('base64')
    }));
  }

  await client
    .api(`/users/${SENDER()}/sendMail`)
    .post({ message, saveToSentItems: false });
}

// ── Public functions (same signatures as before) ──────────────────────────────

async function sendWelcomeEmail(to, username, password) {
  try {
    await sendMail({
      to,
      subject: 'Your PMO Dashboard Account',
      html: `
        <h2>Welcome to PMO Dashboard</h2>
        <p>Hi ${username},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>Login Details:</strong></p>
        <ul>
          <li>Username: ${username}</li>
          <li>Password: ${password}</li>
        </ul>
        <p>Login at: <a href="${APP_URL()}/login">${APP_URL()}/login</a></p>
        <p>Please change your password after your first login.</p>
      `
    });
    console.log('Welcome email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(to, code) {
  try {
    await sendMail({
      to,
      subject: 'PMO Dashboard - Password Reset Code',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your PMO Dashboard account.</p>
        <p><strong>Your reset code is: ${code}</strong></p>
        <p>Enter this code on the password reset page.</p>
        <p><em>This code will expire in 15 minutes.</em></p>
        <br>
        <p style="color: #666; font-size: 12px;">If you didn't request this reset, please ignore this email.</p>
      `
    });
    console.log('Password reset email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

async function sendWeeklyUpdateReminder(to, resourceName, weekStarting, managerName) {
  const weekDate = new Date(weekStarting);
  const weekEnd = new Date(weekDate);
  weekEnd.setDate(weekDate.getDate() + 4);
  const weekLabel = `${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  try {
    await sendMail({
      to,
      subject: `Reminder: Weekly Update Due - Week of ${weekLabel}`,
      html: `
        <h2>Weekly Update Reminder</h2>
        <p>Hi ${resourceName},</p>
        <p>This is a friendly reminder to submit your weekly update for the week of <strong>${weekLabel}</strong>.</p>
        <p>Please log in to the PMO Dashboard and submit your update at your earliest convenience.</p>
        <br>
        <p>
          <a href="${APP_URL()}/weekly-updates"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Submit Weekly Update
          </a>
        </p>
        <br>
        ${managerName ? `<p><em>Sent by ${managerName}</em></p>` : ''}
        <br>
        <p style="color: #666; font-size: 12px;">If you have already submitted your update, please disregard this email.</p>
      `
    });
    console.log('Weekly update reminder sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send weekly update reminder:', error);
    return { success: false, error: error.message };
  }
}

async function sendPortfolioExportEmail(recipients, attachmentBuffer, filename, format) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fileExtension = format === 'excel' ? 'xlsx' : 'csv';
  const contentType = format === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';

  try {
    await sendMail({
      to: recipients,
      subject: `Portfolio Export - ${today}`,
      html: `
        <h2>Portfolio Export</h2>
        <p>Please find attached the portfolio export generated on <strong>${today}</strong>.</p>
        <p>This is an automated export containing the latest project data from the PMO Dashboard.</p>
        <br>
        <p style="color: #666; font-size: 12px;">If you have any questions about this export, please contact your system administrator.</p>
      `,
      attachments: [
        {
          filename: `${filename}.${fileExtension}`,
          content: attachmentBuffer,
          contentType
        }
      ]
    });
    console.log('Portfolio export email sent to:', recipients);
    return { success: true };
  } catch (error) {
    console.error('Failed to send portfolio export email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendWeeklyUpdateReminder, sendPortfolioExportEmail };
