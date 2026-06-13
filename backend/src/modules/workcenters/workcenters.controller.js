import * as workCenterService from './workcenters.service.js';

export const listWorkCenters = async (req, res, next) => {
  try {
    const workCenters = await workCenterService.getWorkCenters();
    res.status(200).json(workCenters);
  } catch (err) {
    next(err);
  }
};

export const createWorkCenter = async (req, res, next) => {
  try {
    const workCenter = await workCenterService.createWorkCenter(req.body, req.user.id);
    res.status(201).json({ message: 'Work Center created successfully', workCenter });
  } catch (err) {
    next(err);
  }
};
