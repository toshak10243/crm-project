const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://postgres:Root%40123@localhost:5432/crm_tenant_apex' });
  await c.connect();

  const aboutCompanyData = {
    companyName: 'Apex Global Technologies',
    brandName: 'Apex CRM',
    logoUrl: '',
    tagline: 'Empowering Businesses with Next-Gen CRM Solutions',
    gstin: '08AAAAA0000A1Z5',
    pan: 'ABCDE1234F',
    cin: 'U72900RJ2026PTC012345',
    msmeUdyam: 'UDYAM-RJ-14-0012345',
    email: 'contact@apexglobal.com',
    supportEmail: 'support@apexglobal.com',
    phone: '+91 98765 43210',
    alternatePhone: '+91 80000 12345',
    website: 'https://apexglobal.com',
    addressLine1: 'Plot No. 42, Tech Park',
    addressLine2: 'Malviya Nagar',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302017',
    country: 'India',
    bankName: 'HDFC Bank',
    accountHolderName: 'Apex Global Technologies Pvt Ltd',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0001234',
    upiId: 'apexglobal@hdfcbank'
  };

  await c.query(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('about_company', $1::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, [JSON.stringify(aboutCompanyData)]);

  console.log('Seeded about_company in settings table successfully');
  await c.end();
}

run().catch(console.error);

