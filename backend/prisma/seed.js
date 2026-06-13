import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo-company",
    },
  });

  const hash = await bcrypt.hash("Admin@123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@erp.com"
      }
    },
    update: {},
    create: {
      name: "Admin",
      email: "admin@erp.com",
      passwordHash: hash,
      role: "ADMIN",
      tenantId: tenant.id,
      mustChangePassword: false,
    },
  });

  console.log("Seed complete: admin@erp.com / Admin@123 -- Tenant: Demo Company");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
