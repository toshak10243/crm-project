// Redis service -- OTP cache, rate limiting, token blacklist
// Har jagah se use hoga -- auth, leads, dashboard

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        // Connection fail hone pe retry karo
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });
  }

  // OTP save karo -- TTL seconds mein
  async setOtp(key: string, otp: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(`otp:${key}`, ttlSeconds, otp);
  }

  // OTP get karo
  async getOtp(key: string): Promise<string | null> {
    return await this.client.get(`otp:${key}`);
  }

  // OTP delete karo -- use hone ke baad
  async deleteOtp(key: string): Promise<void> {
    await this.client.del(`otp:${key}`);
  }

  // OTP TTL check karo -- kitna time bacha hai
  async getOtpTtl(key: string): Promise<number> {
    return await this.client.ttl(`otp:${key}`);
  }

  // Rate limiting -- login attempts track karo
  async incrementLoginAttempts(key: string): Promise<number> {
    const attempts = await this.client.incr(`login_attempts:${key}`);
    if (attempts === 1) {
      // Pehli baar -- 15 min ka TTL set karo
      await this.client.expire(`login_attempts:${key}`, 900);
    }
    return attempts;
  }

  // Login attempts check karo
  async getLoginAttempts(key: string): Promise<number> {
    const attempts = await this.client.get(`login_attempts:${key}`);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  // Login attempts reset karo -- successful login ke baad
  async resetLoginAttempts(key: string): Promise<void> {
    await this.client.del(`login_attempts:${key}`);
  }

  // Account block karo -- too many attempts
  async blockAccount(key: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(`blocked:${key}`, ttlSeconds, '1');
  }

  // Account blocked hai check karo
  async isBlocked(key: string): Promise<boolean> {
    const blocked = await this.client.get(`blocked:${key}`);
    return blocked === '1';
  }

  // Block ka remaining time
  async getBlockTtl(key: string): Promise<number> {
    return await this.client.ttl(`blocked:${key}`);
  }

  // Token blacklist mein add karo -- logout ke baad
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(`blacklist:${token}`, ttlSeconds, '1');
  }

  // Token blacklisted hai check karo
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${token}`);
    return result === '1';
  }

  // Cache set karo -- dashboard stats etc
  async setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.client.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
  }

  // Cache get karo
  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.client.get(`cache:${key}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  // Cache delete karo
  async deleteCache(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }

  // OTP resend allowed hai check karo -- 60 sec cooldown
  async canResendOtp(key: string): Promise<{ allowed: boolean; remainingSeconds: number }> {
    const ttl = await this.client.ttl(`otp_cooldown:${key}`);
    if (ttl > 0) {
      return { allowed: false, remainingSeconds: ttl };
    }
    return { allowed: true, remainingSeconds: 0 };
  }

  // OTP resend cooldown set karo -- 60 seconds
  async setOtpCooldown(key: string): Promise<void> {
    await this.client.setex(`otp_cooldown:${key}`, 60, '1');
  }

  // App band hone pe Redis connection close karo
  async onModuleDestroy() {
    await this.client.quit();
    console.log('Redis connection closed');
  }
}