import nodemailer from 'nodemailer';
import 'dotenv/config';

const smtpUser = process.env.BREVO_SMTP_USER;
const smtpPass = process.env.BREVO_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'noreply@rapiderp.com';

if (!smtpUser || !smtpPass) {
  console.error('SMTP credentials missing in .env');
  process.exit(1);
}

const ports = [
  { port: 587, secure: false, name: '587 (STARTTLS)' },
  { port: 2525, secure: false, name: '2525 (STARTTLS)' },
  { port: 465, secure: true, name: '465 (SSL/TLS)' }
];

async function testPort({ port, secure, name }) {
  console.log(`Testing port ${name}...`);
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  try {
    await transporter.verify();
    console.log(`✅ Port ${name} verified successfully!`);
    
    // Attempt to send a test email
    const info = await transporter.sendMail({
      from: `"Rapid ERP Test" <${emailFrom}>`,
      to: 'aksht554@gmail.com', // test recipient
      subject: `Rapid ERP SMTP Test - Port ${port}`,
      text: `This is a test email from Rapid ERP on port ${port}`,
    });
    console.log(`   Email sent successfully: ${info.messageId}`);
    return true;
  } catch (err) {
    console.log(`❌ Port ${name} failed:`, err.message);
    return false;
  }
}

async function main() {
  for (const config of ports) {
    const success = await testPort(config);
    if (success) {
      console.log('\nFound working SMTP config!');
      break;
    }
  }
}

main().catch(console.error);
