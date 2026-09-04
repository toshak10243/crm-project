// Subscription cron jobs -- automatically emails bhejta hai
// Har roz subah 9 baje run hota hai
// Trial ending, expiry warnings, data deletion warnings

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DbManagerService } from '../../database/db-manager.service';
import { MailService } from '../../common/services/mail.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private dbManager: DbManagerService,
    private mailService: MailService,
  ) {}

  // Har roz subah 9 baje run hota hai
  @Cron('0 9 * * *')
  async handleSubscriptionChecks() {
    this.logger.log('Running subscription checks...');

    await Promise.all([
      this.checkTrialEnding(),
      this.checkTrialExpired(),
      this.checkSubscriptionExpiring(),
      this.checkSubscriptionExpired(),
      this.checkDataDeletion(),
    ]);

    this.logger.log('Subscription checks completed');
  }

  // Trial 2 din baad khatam hoga -- email bhejo
  private async checkTrialEnding() {
    const pool = this.dbManager.getMasterPool();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      // 2 din bache
      const twoDaysResult = await pool.query(
        `SELECT * FROM companies 
         WHERE plan = 'trial'
         AND is_active = true
         AND trial_ends_at::date = (NOW() + INTERVAL '2 days')::date`,
      );

      for (const company of twoDaysResult.rows) {
        await this.mailService.sendTrialEndingSoonEmail(
          company.admin_email,
          company.admin_name,
          company.name,
          2,
          new Date(company.trial_ends_at),
          `${frontendUrl}/payment`,
        );
        this.logger.log(`Trial ending (2 days) email sent: ${company.admin_email}`);
      }

      // 1 din bacha
      const oneDayResult = await pool.query(
        `SELECT * FROM companies 
         WHERE plan = 'trial'
         AND is_active = true
         AND trial_ends_at::date = (NOW() + INTERVAL '1 day')::date`,
      );

      for (const company of oneDayResult.rows) {
        await this.mailService.sendTrialEndingSoonEmail(
          company.admin_email,
          company.admin_name,
          company.name,
          1,
          new Date(company.trial_ends_at),
          `${frontendUrl}/payment`,
        );
        this.logger.log(`Trial ending (1 day) email sent: ${company.admin_email}`);
      }
    } catch (error: any) {
      this.logger.error('checkTrialEnding failed:', error.message);
    }
  }

  // Trial aaj khatam hua -- email bhejo aur account suspend karo
  private async checkTrialExpired() {
    const pool = this.dbManager.getMasterPool();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      const result = await pool.query(
        `SELECT * FROM companies 
         WHERE plan = 'trial'
         AND is_active = true
         AND trial_ends_at < NOW()`,
      );

      for (const company of result.rows) {
        // Plan expired mein update karo
        await pool.query(
          `UPDATE companies 
           SET plan = 'expired', is_active = false, updated_at = NOW()
           WHERE id = $1`,
          [company.id],
        );

        await this.mailService.sendTrialExpiredEmail(
          company.admin_email,
          company.admin_name,
          company.name,
          `${frontendUrl}/payment`,
        );

        this.logger.log(`Trial expired email sent: ${company.admin_email}`);
      }
    } catch (error: any) {
      this.logger.error('checkTrialExpired failed:', error.message);
    }
  }

  // Subscription expiring -- 7, 3, 1 din pehle
  private async checkSubscriptionExpiring() {
    const pool = this.dbManager.getMasterPool();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      const daysToCheck = [7, 3, 1];

      for (const days of daysToCheck) {
        const result = await pool.query(
          `SELECT * FROM companies 
           WHERE plan = 'active'
           AND is_active = true
           AND subscription_ends_at::date = (NOW() + INTERVAL '${days} days')::date`,
        );

        for (const company of result.rows) {
          await this.mailService.sendSubscriptionExpiringSoonEmail(
            company.admin_email,
            company.admin_name,
            company.name,
            days,
            new Date(company.subscription_ends_at),
            `${frontendUrl}/payment`,
          );
          this.logger.log(
            `Subscription expiring (${days} days) email sent: ${company.admin_email}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error('checkSubscriptionExpiring failed:', error.message);
    }
  }

  // Subscription aaj khatam hua -- email bhejo aur suspend karo
  private async checkSubscriptionExpired() {
    const pool = this.dbManager.getMasterPool();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      const result = await pool.query(
        `SELECT * FROM companies 
         WHERE plan = 'active'
         AND is_active = true
         AND subscription_ends_at < NOW()`,
      );

      for (const company of result.rows) {
        // Expired mein update karo
        await pool.query(
          `UPDATE companies 
           SET plan = 'expired', is_active = false, updated_at = NOW()
           WHERE id = $1`,
          [company.id],
        );

        await this.mailService.sendSubscriptionExpiredEmail(
          company.admin_email,
          company.admin_name,
          company.name,
          `${frontendUrl}/payment`,
        );

        this.logger.log(`Subscription expired email sent: ${company.admin_email}`);
      }
    } catch (error: any) {
      this.logger.error('checkSubscriptionExpired failed:', error.message);
    }
  }

  // Data deletion warning -- 24 hrs baad jo renew nahi kiya
  private async checkDataDeletion() {
    const pool = this.dbManager.getMasterPool();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      // Jo 24 hrs pehle expire hue aur abhi bhi expired hain
      const result = await pool.query(
        `SELECT * FROM companies 
         WHERE plan = 'expired'
         AND is_active = false
         AND (
           (trial_ends_at IS NOT NULL AND trial_ends_at::date = (NOW() - INTERVAL '1 day')::date)
           OR
           (subscription_ends_at IS NOT NULL AND subscription_ends_at::date = (NOW() - INTERVAL '1 day')::date)
         )`,
      );

      for (const company of result.rows) {
        await this.mailService.sendDataDeletionWarningEmail(
          company.admin_email,
          company.admin_name,
          company.name,
          `${frontendUrl}/payment`,
        );

        this.logger.log(`Data deletion warning email sent: ${company.admin_email}`);
      }
    } catch (error: any) {
      this.logger.error('checkDataDeletion failed:', error.message);
    }
  }
}