import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage();

export const requestContextMiddleware = (req, res, next) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  requestContext.run({ ipAddress, userAgent }, next);
};

export const getContext = () => {
  return requestContext.getStore() || {};
};
