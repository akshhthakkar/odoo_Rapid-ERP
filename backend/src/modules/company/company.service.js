import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';

export const registerTenantService = async ({ companyName, adminName, email, password }) => {
  // Validate inputs
  if (!companyName || !adminName || !email || !password) {
    throw { status: 400, message: 'Company name, admin name, email, and password are all required' };
  }
  if (password.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw { status: 400, message: 'Invalid email format' };
  }


  // Generate a unique slug for the tenant
  const baseSlug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const slug = `${baseSlug}-${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: companyName.trim(), slug },
    });
    const user = await tx.user.create({
      data: {
        name: adminName.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'ADMIN',
        tenantId: tenant.id,
        mustChangePassword: false,
      },
    });
    await tx.warehouse.create({
      data: {
        tenantId: tenant.id,
        code: 'MAIN',
        name: 'Main Warehouse',
        isActive: true,
      },
    });
    return { tenant, user };
  });

  const payload = {
    id: result.user.id,
    uid: result.user.uid,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
    tenantId: result.tenant.id,
    mustChangePassword: false,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

  return {
    token,
    user: payload,
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
  };
};
