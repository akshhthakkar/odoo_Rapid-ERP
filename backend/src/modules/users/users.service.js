import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma.js';
import { sendUserInvitationEmail } from '../../utils/emailService.js';
import { logAudit, getDiff } from '../../utils/auditLogger.js';

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── INVITE USER ──────────────────────────────────────────────────────────────

export const inviteUserService = async ({ name, email, role }, invitedBy) => {
  if (!name || !email || !role) {
    throw { status: 400, message: 'Name, email, and role are required' };
  }

  const validRoles = ['SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER', 'ADMIN'];
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
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  // Log invitation audit trail
  await logAudit({
    tenantId: invitedBy.tenantId,
    userId: invitedBy.id,
    action: "USER_INVITED",
    entityType: "User",
    entityId: user.id,
    description: `User "${user.name}" invited with role ${role}`,
  });

  await logAudit({
    tenantId: invitedBy.tenantId,
    userId: invitedBy.id,
    action: "INVITATION_SENT",
    entityType: "User",
    entityId: user.id,
    description: `Invitation email queued to be sent to ${user.email}`,
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
    tempPassword,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};

// ─── GET COMPANY USERS ────────────────────────────────────────────────────────

export const getCompanyUsersService = async (tenantId, query = {}) => {
  const page = query.page ? parseInt(query.page, 10) : null;
  const limit = query.limit ? parseInt(query.limit, 10) : null;
  const search = query.search || "";

  const where = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalItems = await prisma.user.count({ where });

  let users;
  if (page && limit) {
    const skip = (page - 1) * limit;
    users = await prisma.user.findMany({
      where,
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
      skip,
      take: limit,
    });

    return {
      data: users,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    };
  }

  return prisma.user.findMany({
    where,
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

  const wasForced = user.mustChangePassword;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      mustChangePassword: false,
    },
  });

  if (wasForced) {
    await logAudit({
      tenantId: user.tenantId,
      userId,
      action: "INVITATION_ACCEPTED",
      entityType: "User",
      entityId: userId,
      description: `User "${user.name}" accepted invitation and completed registration`,
    });
  } else {
    await logAudit({
      tenantId: user.tenantId,
      userId,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: userId,
      description: `User "${user.name}" changed account password`,
    });
  }

  return { message: 'Password changed successfully' };
};

// ─── UPDATE USER STATUS ───────────────────────────────────────────────────────

export const updateUserStatusService = async (id, isActive, adminUser) => {
  if (isActive === undefined) throw { status: 400, message: "isActive status is required" };

  const user = await prisma.user.findFirst({
    where: { id: Number(id), tenantId: adminUser.tenantId }
  });
  if (!user) throw { status: 404, message: "User not found" };

  if (user.id === adminUser.id) throw { status: 400, message: "You cannot change your own active status" };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: !!isActive }
  });

  const { oldValues, newValues } = getDiff(user, updated);
  
  await logAudit({
    tenantId: adminUser.tenantId,
    userId: adminUser.id,
    action: updated.isActive ? "USER_CREATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: user.id,
    description: `User "${user.name}" status updated to ${updated.isActive ? 'Active' : 'Inactive'}`,
    oldValues,
    newValues
  });

  return updated;
};

// ─── UPDATE USER ROLE ─────────────────────────────────────────────────────────

export const updateUserRoleService = async (id, role, adminUser) => {
  if (!role) throw { status: 400, message: "Role is required" };
  const validRoles = ['SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER', 'ADMIN'];
  if (!validRoles.includes(role)) throw { status: 400, message: "Invalid role" };

  const user = await prisma.user.findFirst({
    where: { id: Number(id), tenantId: adminUser.tenantId }
  });
  if (!user) throw { status: 404, message: "User not found" };

  if (user.id === adminUser.id) throw { status: 400, message: "You cannot change your own role" };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role }
  });

  const { oldValues, newValues } = getDiff(user, updated);

  await logAudit({
    tenantId: adminUser.tenantId,
    userId: adminUser.id,
    action: "ROLE_CHANGED",
    entityType: "User",
    entityId: user.id,
    description: `User "${user.name}" role updated from ${user.role} to ${role}`,
    oldValues,
    newValues
  });

  return updated;
};
