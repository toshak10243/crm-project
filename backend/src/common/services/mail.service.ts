// Email bhejne ki service -- Nodemailer use karta hai
// SMTP config .env se aata hai
// Saare email templates yahan hain

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('smtp.host'),
      port: this.configService.get<number>('smtp.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.pass'),
      },
    });
  }

  // Base HTML template -- sab emails isme wrap hote hain
  private baseTemplate(content: string, title: string = 'CRM System'): string {
    const frontendUrl = this.configService.get<string>('frontend.url');
    const logoUrl = `${frontendUrl}/logo.png`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                              border-radius: 12px 12px 0 0;
                              padding: 32px 40px;
                              text-align: center;">
                    <img src="${logoUrl}"
                         alt="CRM Logo"
                         width="48"
                         height="48"
                         style="border-radius: 10px; margin: 0 auto 12px auto; display: block;"
                         onerror="this.style.display='none'">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      CRM System
                    </h1>
                    <p style="color: #c7d2fe; margin: 4px 0 0 0; font-size: 13px;">
                      Lead Management Platform
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="background: #ffffff; padding: 40px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    ${content}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f8fafc;
                              border: 1px solid #e2e8f0;
                              border-top: none;
                              border-radius: 0 0 12px 12px;
                              padding: 20px 40px;
                              text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0;">
                      This is an automated email. Please do not reply.
                    </p>
                    <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                      &copy; ${new Date().getFullYear()} CRM System. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // Internal mail sender
  private async sendMail(
    to: string,
    subject: string,
    content: string,
  ): Promise<void> {
    const mailOptions = {
      from: `"CRM System" <${this.configService.get('smtp.user')}>`,
      to,
      subject,
      html: this.baseTemplate(content, subject),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to: ${to} | Subject: ${subject}`);
    } catch (error: any) {
      console.error(`Email failed for ${to}:`, error.message);
    }
  }

  // 1. Trial Welcome Email -- company create hone par
  async sendTrialWelcomeEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    tempPassword: string,
    loginUrl: string,
    trialEndsAt: Date,
  ): Promise<void> {
    const trialEndFormatted = trialEndsAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const content = `
      <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 22px;">
        Welcome to CRM System, ${adminName}!
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Your <strong style="color: #1e293b;">7-day free trial</strong> for
        <strong style="color: #1e293b;">${companyName}</strong> has started.
        Here are your login credentials:
      </p>

      <!-- Trial Badge -->
      <div style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);
                  border: 2px solid #c4b5fd;
                  border-radius: 10px;
                  padding: 16px 24px;
                  margin: 0 0 24px 0;
                  text-align: center;">
        <p style="color: #7c3aed; font-size: 13px; text-transform: uppercase;
                  letter-spacing: 1px; margin: 0 0 4px 0; font-weight: 600;">
          Free Trial Active
        </p>
        <p style="color: #4f46e5; font-size: 18px; font-weight: 700; margin: 0;">
          Expires on ${trialEndFormatted}
        </p>
      </div>

      <!-- Credentials -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Login URL</span><br>
              <a href="${loginUrl}" style="color: #4f46e5; font-size: 14px; text-decoration: none; font-weight: 500;">
                ${loginUrl}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span><br>
              <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${adminEmail}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</span><br>
              <code style="background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 6px; font-size: 16px; font-weight: 700; letter-spacing: 1px;">
                ${tempPassword}
              </code>
            </td>
          </tr>
        </table>
      </div>

      <!-- Warning -->
      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important:</strong> You will be asked to change your password on first login.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}"
           style="background: linear-gradient(135deg, #4f46e5, #7c3aed);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Start Your Free Trial
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Welcome to CRM System - Your 7-Day Free Trial Has Started!`,
      content,
    );
  }

  // 2. Admin Welcome Email (paid) -- subscription activate hone par
  async sendAdminWelcomeEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    tempPassword: string,
    loginUrl: string,
  ): Promise<void> {
    const content = `
      <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 22px;">
        Welcome, ${adminName}!
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Your CRM account for <strong style="color: #1e293b;">${companyName}</strong>
        has been created successfully. Here are your login credentials:
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Login URL</span><br>
              <a href="${loginUrl}" style="color: #4f46e5; font-size: 14px; text-decoration: none; font-weight: 500;">
                ${loginUrl}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span><br>
              <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${adminEmail}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</span><br>
              <code style="background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 6px; font-size: 16px; font-weight: 700;">
                ${tempPassword}
              </code>
            </td>
          </tr>
        </table>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important:</strong> Please change your password immediately after first login.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}"
           style="background: linear-gradient(135deg, #4f46e5, #7c3aed);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Login to CRM
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Your CRM Account is Ready - ${companyName}`,
      content,
    );
  }

  // 3. Trial Ending Soon -- 2 din bache
  async sendTrialEndingSoonEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    daysLeft: number,
    trialEndsAt: Date,
    paymentUrl: string,
  ): Promise<void> {
    const trialEndFormatted = trialEndsAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const content = `
      <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 22px;">
        Your Trial is Ending Soon, ${adminName}!
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Your free trial for <strong style="color: #1e293b;">${companyName}</strong>
        will expire in <strong style="color: #ef4444;">${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>
        on <strong>${trialEndFormatted}</strong>.
      </p>

      <!-- Urgency Banner -->
      <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px;
                  padding: 20px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: #dc2626; font-size: 28px; font-weight: 800; margin: 0 0 4px 0;">
          ${daysLeft} Day${daysLeft > 1 ? 's' : ''} Left
        </p>
        <p style="color: #991b1b; font-size: 14px; margin: 0;">
          Upgrade now to continue using all features without interruption
        </p>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #166534; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">
          What you get with a full subscription:
        </p>
        <ul style="color: #15803d; font-size: 14px; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;">Unlimited leads and clients</li>
          <li style="margin-bottom: 6px;">Full automation engine</li>
          <li style="margin-bottom: 6px;">WhatsApp & email integration</li>
          <li style="margin-bottom: 6px;">Advanced reports & analytics</li>
          <li style="margin-bottom: 0;">Priority support</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${paymentUrl}"
           style="background: linear-gradient(135deg, #16a34a, #15803d);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Upgrade Now
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Action Required: Your CRM Trial Expires in ${daysLeft} Day${daysLeft > 1 ? 's' : ''} - ${companyName}`,
      content,
    );
  }

  // 4. Trial Expired -- same day
  async sendTrialExpiredEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    paymentUrl: string,
  ): Promise<void> {
    const content = `
      <h2 style="color: #dc2626; margin: 0 0 8px 0; font-size: 22px;">
        Your Trial Has Expired
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${adminName}</strong>,
        your 7-day free trial for <strong style="color: #1e293b;">${companyName}</strong>
        has ended.
      </p>

      <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px;
                  padding: 24px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: #dc2626; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">
          Trial Period Ended
        </p>
        <p style="color: #991b1b; font-size: 14px; margin: 0;">
          Your data is safe. Upgrade within 24 hours to continue without any data loss.
        </p>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
                  padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important:</strong> Your data will be retained for 24 hours.
          Please upgrade immediately to avoid any disruption.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${paymentUrl}"
           style="background: linear-gradient(135deg, #dc2626, #b91c1c);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Upgrade Now to Keep Your Data
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Your CRM Trial Has Expired - Upgrade Now to Keep Your Data`,
      content,
    );
  }

  // 5. Subscription Activated -- payment verify hone par
  async sendSubscriptionActivatedEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    plan: string,
    subscriptionEndsAt: Date,
    amount: number,
  ): Promise<void> {
    const endDateFormatted = subscriptionEndsAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const content = `
      <h2 style="color: #16a34a; margin: 0 0 8px 0; font-size: 22px;">
        Subscription Activated Successfully!
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${adminName}</strong>,
        your subscription for <strong style="color: #1e293b;">${companyName}</strong>
        has been activated.
      </p>

      <!-- Success Banner -->
      <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px;
                  padding: 24px; margin: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">
              <span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Plan</span><br>
              <span style="color: #1e293b; font-size: 15px; font-weight: 600;">${plan}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">
              <span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Amount Paid</span><br>
              <span style="color: #1e293b; font-size: 15px; font-weight: 600;">
                Rs. ${amount.toLocaleString('en-IN')}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Valid Until</span><br>
              <span style="color: #16a34a; font-size: 15px; font-weight: 700;">${endDateFormatted}</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">
        Thank you for choosing CRM System. You now have full access to all features.
        We will remind you before your subscription expires.
      </p>

      <div style="text-align: center;">
        <a href="${this.configService.get('frontend.url')}/login"
           style="background: linear-gradient(135deg, #16a34a, #15803d);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Go to Dashboard
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Subscription Activated - ${companyName} - Valid Until ${endDateFormatted}`,
      content,
    );
  }

  // 6. Subscription Expiring Soon -- 7, 3, 1 din pehle
  async sendSubscriptionExpiringSoonEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    daysLeft: number,
    expiresAt: Date,
    renewUrl: string,
  ): Promise<void> {
    const expireDateFormatted = expiresAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const urgencyColor =
      daysLeft === 1
        ? '#dc2626'
        : daysLeft === 3
          ? '#ea580c'
          : '#f59e0b';

    const content = `
      <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 22px;">
        Your Subscription is Expiring Soon
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${adminName}</strong>,
        your CRM subscription for <strong style="color: #1e293b;">${companyName}</strong>
        will expire in <strong style="color: ${urgencyColor};">
          ${daysLeft} day${daysLeft > 1 ? 's' : ''}
        </strong> on <strong>${expireDateFormatted}</strong>.
      </p>

      <div style="background: #fffbeb; border: 2px solid #fcd34d; border-radius: 10px;
                  padding: 20px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: ${urgencyColor}; font-size: 32px; font-weight: 800; margin: 0 0 4px 0;">
          ${daysLeft} Day${daysLeft > 1 ? 's' : ''} Remaining
        </p>
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          Renew now to avoid any interruption to your business
        </p>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
                  padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          <strong>Warning:</strong> After expiry, your account will be suspended
          and data will be retained for 48 hours only.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${renewUrl}"
           style="background: linear-gradient(135deg, #f59e0b, #d97706);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Renew Subscription
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Action Required: CRM Subscription Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''} - ${companyName}`,
      content,
    );
  }

  // 7. Subscription Expired -- same day
  async sendSubscriptionExpiredEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    renewUrl: string,
  ): Promise<void> {
    const content = `
      <h2 style="color: #dc2626; margin: 0 0 8px 0; font-size: 22px;">
        Your Subscription Has Expired
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${adminName}</strong>,
        your CRM subscription for <strong style="color: #1e293b;">${companyName}</strong>
        has expired.
      </p>

      <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px;
                  padding: 24px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: #dc2626; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">
          Subscription Expired
        </p>
        <p style="color: #991b1b; font-size: 14px; margin: 0;">
          Your data is safe. Renew within 48 hours to avoid permanent data deletion.
        </p>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
                  padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important:</strong> Your data including all leads, clients, and reports
          will be permanently deleted after 48 hours if subscription is not renewed.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${renewUrl}"
           style="background: linear-gradient(135deg, #dc2626, #b91c1c);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Renew Now to Keep Your Data
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `Your CRM Subscription Has Expired - Renew Now`,
      content,
    );
  }

  // 8. Data Deletion Warning -- 24 hrs baad
  async sendDataDeletionWarningEmail(
    adminEmail: string,
    adminName: string,
    companyName: string,
    renewUrl: string,
  ): Promise<void> {
    const content = `
      <h2 style="color: #dc2626; margin: 0 0 8px 0; font-size: 22px;">
        Final Warning: Your Data Will Be Deleted in 24 Hours
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${adminName}</strong>,
        this is a final warning regarding your CRM account for
        <strong style="color: #1e293b;">${companyName}</strong>.
      </p>

      <div style="background: #fef2f2; border: 3px solid #dc2626; border-radius: 10px;
                  padding: 24px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: #dc2626; font-size: 22px; font-weight: 800; margin: 0 0 8px 0;">
          DATA DELETION IN 24 HOURS
        </p>
        <p style="color: #991b1b; font-size: 15px; margin: 0;">
          All your leads, clients, quotations, and reports will be
          permanently deleted if you do not renew now.
        </p>
      </div>

      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
                  padding: 16px; margin: 0 0 8px 0;">
        <p style="margin: 0; color: #9a3412; font-size: 14px;">
          This action cannot be undone. Once deleted, your data cannot be recovered.
        </p>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
                  padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>Good News:</strong> If you renew now, all your data will be preserved
          and your account will be fully restored immediately.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${renewUrl}"
           style="background: linear-gradient(135deg, #dc2626, #b91c1c);
                  color: #ffffff;
                  padding: 16px 40px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 700;
                  font-size: 16px;
                  display: inline-block;">
          RENEW NOW - SAVE MY DATA
        </a>
      </div>
    `;

    await this.sendMail(
      adminEmail,
      `URGENT: Your CRM Data Will Be Deleted in 24 Hours - ${companyName}`,
      content,
    );
  }

  // 9. OTP Email -- forgot password ke liye
  async sendOtpEmail(
    email: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const content = `
      <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 22px;">
        Password Reset OTP
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${name}</strong>,
        use the OTP below to reset your password.
      </p>

      <div style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);
                  border: 2px solid #c4b5fd;
                  border-radius: 12px;
                  padding: 32px;
                  text-align: center;
                  margin: 0 0 24px 0;">
        <p style="color: #7c3aed; font-size: 13px; text-transform: uppercase;
                  letter-spacing: 2px; margin: 0 0 12px 0; font-weight: 600;">
          Your OTP Code
        </p>
        <div style="background: #ffffff; border-radius: 8px; padding: 16px; display: inline-block; min-width: 200px;">
          <span style="color: #4f46e5; font-size: 42px; font-weight: 800;
                        letter-spacing: 10px; font-family: monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #7c3aed; font-size: 13px; margin: 12px 0 0 0;">
          Valid for <strong>10 minutes</strong> only
        </p>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
                  padding: 16px; margin: 0 0 16px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          <strong>Security Notice:</strong> Never share this OTP with anyone.
          Our team will never ask for your OTP.
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        If you did not request a password reset, please ignore this email.
        Your account is safe.
      </p>
    `;

    await this.sendMail(
      email,
      'Your OTP for Password Reset - CRM System',
      content,
    );
  }

  // 10. Password Reset Email -- admin ne kisi ka reset kiya
  async sendPasswordResetEmail(
    email: string,
    name: string,
    tempPassword: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontend.url');

    const content = `
      <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 22px;">
        Password Reset
      </h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px;">
        Hello <strong style="color: #1e293b;">${name}</strong>,
        your password has been reset by the administrator.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
                  padding: 24px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase;
                  letter-spacing: 0.5px; margin: 0 0 8px 0;">
          New Temporary Password
        </p>
        <code style="background: #ede9fe; color: #6d28d9; padding: 8px 20px;
                     border-radius: 8px; font-size: 22px; font-weight: 700; letter-spacing: 2px;">
          ${tempPassword}
        </code>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
                  padding: 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important:</strong> Please login and change your password immediately.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${frontendUrl}/login"
           style="background: linear-gradient(135deg, #4f46e5, #7c3aed);
                  color: #ffffff;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 15px;
                  display: inline-block;">
          Login Now
        </a>
      </div>
    `;

    await this.sendMail(email, 'Your CRM Password Has Been Reset', content);
  }
}