import { inviteUserService, getCompanyUsersService, changePasswordService } from './users.service.js';

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
