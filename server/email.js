const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

async function sendWelcomeEmail(to, username, password) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to,
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
      <p>Login at: <a href="http://pmotest.zapcom.ai/login</a></p>
      <p>Please change your password after your first login.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(to, code) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to,
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
  };

  try {
    await transporter.sendMail(mailOptions);
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

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to,
    subject: `Reminder: Weekly Update Due - Week of ${weekLabel}`,
    html: `
      <h2>Weekly Update Reminder</h2>
      <p>Hi ${resourceName},</p>
      <p>This is a friendly reminder to submit your weekly update for the week of <strong>${weekLabel}</strong>.</p>
      <p>Please log in to the PMO Dashboard and submit your update at your earliest convenience.</p>
      <br>
      <p><a href="http://localhost:3000/weekly-updates" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Submit Weekly Update</a></p>
      <br>
      ${managerName ? `<p><em>Sent by ${managerName}</em></p>` : ''}
      <br>
      <p style="color: #666; font-size: 12px;">If you have already submitted your update, please disregard this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
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

  const mailOptions = {
    from: process.env.SMTP_USER,
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
        contentType: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Portfolio export email sent to:', recipients);
    return { success: true };
  } catch (error) {
    console.error('Failed to send portfolio export email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendWeeklyUpdateReminder, sendPortfolioExportEmail };
