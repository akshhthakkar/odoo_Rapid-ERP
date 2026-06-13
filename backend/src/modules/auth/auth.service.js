import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/auditLogger.js';

// ─── REGISTER ─────────────────────────────────────────────────────────────────

export const registerUser = async ({ name, email, password, role }) => {
  // Input validation
  if (!name || !email || !password) {
    throw { status: 400, message: 'Name, email, and password are required' };
  }
  if (password.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters' };
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw { status: 400, message: 'Invalid email format' };
  }

  // Duplicate check
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw { status: 409, message: 'A user with this email already exists' };
  }

  // Valid role check
  const validRoles = ['ADMIN', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER'];
  const assignedRole = role && validRoles.includes(role) ? role : 'SALES_USER';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
    },
    select: {
      id: true, uid: true, name: true, email: true, role: true, isActive: true, createdAt: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user.id,
    description: `New user registered: ${user.name} (${user.email}) with role ${user.role}`,
  });

  return user;
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export const loginUser = async ({ email, password }) => {
  // Input validation
  if (!email || !password) {
    throw { status: 400, message: 'Email and password are required' };
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Intentionally vague for security — don't reveal which field was wrong
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  if (!user.isActive) {
    throw { status: 403, message: 'Account is deactivated. Contact your admin.' };
  }

  const payload = {
    id: user.id,
    uid: user.uid,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

  return {
    token,
    user: payload,
  };
};

// ─── ME ───────────────────────────────────────────────────────────────────────

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, uid: true, name: true, email: true, role: true, isActive: true, createdAt: true,
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};
