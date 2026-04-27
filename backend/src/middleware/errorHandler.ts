import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err.message);
  
  if (err.message === 'Unauthorized') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  if (err.message === 'Not found') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  if (err.message === 'Forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  
  res.status(500).json({ error: 'Internal server error' });
};