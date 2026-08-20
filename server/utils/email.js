import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // If SMTP credentials configured in .env, use real transport
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Nova Chat" <noreply@novachat.app>',
        to,
        subject,
        text,
        html,
      });

      console.log(`📧 Real email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      // In development without SMTP credentials, log the email action
      console.log(`\n================== 📧 DEV EMAIL DISPATCH ==================`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${text || html}`);
      console.log(`===========================================================\n`);
      return { success: true, devMode: true };
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

export const sendVerificationEmail = async (user, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

  const subject = 'Verify your Nova Chat account';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Welcome to Nova Chat, ${user.name}!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">Please confirm your email address to complete your registration and start chatting privately.</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${verifyUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">Or copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #16a34a;">${verifyUrl}</a></p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Welcome to Nova Chat, ${user.name}!\n\nPlease verify your email by opening the link:\n${verifyUrl}\n\nThis link expires in 24 hours.`;

  return await sendEmail({ to: user.email, subject, html, text });
};

export const sendPasswordResetEmail = async (user, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  const subject = 'Reset your Nova Chat password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">We received a request to reset the password for your Nova Chat account (<strong>@${user.username}</strong>).</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetUrl}" style="background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #0284c7;">${resetUrl}</a></p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
    </div>
  `;
  const text = `Reset your Nova Chat password\n\nPlease visit the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.`;

  return await sendEmail({ to: user.email, subject, html, text });
};
