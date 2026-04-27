import jwt from 'jsonwebtoken';
import { Request } from 'express';
import prisma from '../models/prisma.js';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as JwtPayload;
};

export const getUserIdFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    return null;
  }
};

export const authenticateUser = async (req: Request): Promise<string> => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }
  
  return userId;
};