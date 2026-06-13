import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma.js';
import { sendUserInvitationEmail } from '../../utils/emailService.js';

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── INVITE USER ──────────────────────────────────────────────────────────────

export const inviteUserService = async ({ name, email, role }, invitedBy) => {
  if (!name || !email || !role) {
    throw { status: 400, message: 'Name, email, and role are required' };
  }

  const validRoles = ['SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER'];
  if (!validRoles.includes(role)) {
    throw { status: 400, message: 'Invalid role. Valid roles: ' + validRoles.join(', ') };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw { status: 400, message: 'Invalid email format' };
  }

  const existing = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      tenantId: invitedBy.tenantId
    }
  });
  if (existing) throw { status: 409, message: 'A user with this email already exists under your company' };

  const tenant = await prisma.tenant.findUnique({ where: { id: invitedBy.tenantId } });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      tenantId: invitedBy.tenantId,
      mustChangePassword: true,
    },
  });

  await prisma.userInvite.create({
    data: {
      tenantId: invitedBy.tenantId,
      email: email.toLowerCase().trim(),
      role,
      invitedById: invitedBy.id,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
    },
  });

  // Non-blocking email — failure is logged but never crashes the endpoint
  let emailSent = false;
  try {
    emailSent = await sendUserInvitationEmail({
      tenantName: tenant.name,
      userName: user.name,
      email: user.email,
      role,
      temporaryPassword: tempPassword,
      tenantId: invitedBy.tenantId,
    });
  } catch (err) {
    console.error('[EMAIL] Invite email failed - Error:', err.message || err);
  }

  return {
    message: 'User invited successfully',
    emailSent,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};

// ─── GET COMPANY USERS ────────────────────────────────────────────────────────

export const getCompanyUsersService = async (tenantId) => {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────

export const changePasswordService = async ({ currentPassword, newPassword }, userId) => {
  if (!currentPassword || !newPassword) {
    throw { status: 400, message: 'Both currentPassword and newPassword are required' };
  }
  if (newPassword.length < 6) {
    throw { status: 400, message: 'New password must be at least 6 characters' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'User not found' };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw { status: 401, message: 'Current password is incorrect' };

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      mustChangePassword: false,
    },
  });

  return { message: 'Password changed successfully' };
};
