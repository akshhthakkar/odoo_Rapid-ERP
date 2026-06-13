import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── ADMIN USER ────────────────────────────────────────────────────────────
  const adminEmail = 'admin@erp.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created: admin@erp.com / Admin@123');
  } else {
    console.log('ℹ️  Admin user already exists — skipping');
  }

  // ─── DEMO CUSTOMERS ────────────────────────────────────────────────────────
  const customers = [
    { name: 'Acme Corp', email: 'procurement@acme.com', phone: '+1-555-0100', address: '123 Business Ave, New York, NY' },
    { name: 'Globex Industries', email: 'orders@globex.com', phone: '+1-555-0200', address: '456 Industrial Blvd, Chicago, IL' },
    { name: 'Initech Solutions', email: 'supply@initech.com', phone: '+1-555-0300', address: '789 Tech Park, Austin, TX' },
  ];

  for (const c of customers) {
    const found = await prisma.customer.findFirst({ where: { email: c.email } });
    if (!found) {
      await prisma.customer.create({ data: c });
      console.log(`✅ Customer created: ${c.name}`);
    }
  }

  // ─── DEMO VENDORS ──────────────────────────────────────────────────────────
  const vendors = [
    { name: 'RawMat Suppliers Ltd', email: 'sales@rawmat.com', phone: '+1-555-1001', address: '10 Warehouse Row, Detroit, MI' },
    { name: 'FastParts Co.', email: 'orders@fastparts.com', phone: '+1-555-1002', address: '22 Industrial Zone, Seattle, WA' },
    { name: 'BulkGoods Inc.', email: 'bulk@bulkgoods.com', phone: '+1-555-1003', address: '55 Commerce Street, Dallas, TX' },
  ];

  for (const v of vendors) {
    const found = await prisma.vendor.findFirst({ where: { email: v.email } });
    if (!found) {
      await prisma.vendor.create({ data: v });
      console.log(`✅ Vendor created: ${v.name}`);
    }
  }

  // ─── DEMO WORK CENTERS ─────────────────────────────────────────────────────
  const workCenters = [
    { name: 'Assembly Line', description: 'Main assembly station for finished goods' },
    { name: 'Paint Floor', description: 'Surface treatment and painting station' },
    { name: 'Packaging Unit', description: 'Final packaging and labeling' },
    { name: 'Quality Control', description: 'Inspection and quality assurance' },
  ];

  for (const wc of workCenters) {
    const found = await prisma.workCenter.findFirst({ where: { name: wc.name } });
    if (!found) {
      await prisma.workCenter.create({ data: wc });
      console.log(`✅ Work Center created: ${wc.name}`);
    }
  }

  // ─── DEMO USERS (different roles) ─────────────────────────────────────────
  const demoUsers = [
    { name: 'Sarah Sales', email: 'sarah@erp.com', password: 'Pass@123', role: 'SALES_USER' },
    { name: 'Pete Purchase', email: 'pete@erp.com', password: 'Pass@123', role: 'PURCHASE_USER' },
    { name: 'Mark Manufacturing', email: 'mark@erp.com', password: 'Pass@123', role: 'MANUFACTURING_USER' },
    { name: 'Ivan Inventory', email: 'ivan@erp.com', password: 'Pass@123', role: 'INVENTORY_MANAGER' },
    { name: 'Olivia Owner', email: 'olivia@erp.com', password: 'Pass@123', role: 'BUSINESS_OWNER' },
  ];

  for (const u of demoUsers) {
    const found = await prisma.user.findUnique({ where: { email: u.email } });
    if (!found) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await prisma.user.create({
        data: { name: u.name, email: u.email, passwordHash, role: u.role },
      });
      console.log(`✅ Demo user created: ${u.email} (${u.role})`);
    }
  }

  console.log('\n✨ Seed complete!\n');
  console.log('Demo logins:');
  console.log('  Admin:         admin@erp.com   / Admin@123');
  console.log('  Sales:         sarah@erp.com   / Pass@123');
  console.log('  Purchase:      pete@erp.com    / Pass@123');
  console.log('  Manufacturing: mark@erp.com    / Pass@123');
  console.log('  Inventory:     ivan@erp.com    / Pass@123');
  console.log('  Owner:         olivia@erp.com  / Pass@123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
