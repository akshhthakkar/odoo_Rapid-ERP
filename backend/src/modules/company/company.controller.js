import { registerTenantService } from './company.service.js';

export const registerTenant = async (req, res, next) => {
  try {
    const result = await registerTenantService(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
