import { Request, Response, NextFunction } from 'express';
import { getUserIdFromRequest } from '../utils/auth.js';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as any).userId = userId;
  next();
};