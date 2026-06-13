import { 
  inviteUserService, 
  getCompanyUsersService, 
  changePasswordService,
  updateUserStatusService,
  updateUserRoleService
} from './users.service.js';

export const inviteUser = async (req, res, next) => {
  try {
    const result = await inviteUserService(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getCompanyUsers = async (req, res, next) => {
  try {
    const users = await getCompanyUsersService(req.user.tenantId);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await changePasswordService(req.body, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid user ID" };
    const user = await updateUserStatusService(id, req.body.isActive, req.user);
    res.json({ message: "User status updated successfully", user });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid user ID" };
    const user = await updateUserRoleService(id, req.body.role, req.user);
    res.json({ message: "User role updated successfully", user });
  } catch (err) {
    next(err);
  }
};
