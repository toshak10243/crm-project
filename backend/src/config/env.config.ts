// App ki saari environment variables yahan se aati hain
// Direct process.env use karne ki jagah ye config use karo everywhere

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,

  masterDb: {
    host: process.env.MASTER_DB_HOST || 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT, 10) || 5432,
    database: process.env.MASTER_DB_NAME || 'crm_master',
    user: process.env.MASTER_DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || 'password',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
  },

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@crm.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
  },
});