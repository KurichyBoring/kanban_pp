import { ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
      next(error);
    }
  };
};

export const loginSchema = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email format',
  password: (v: string) => v.length >= 6 ? null : 'Password must be at least 6 characters',
};

export const registerSchema = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email format',
  password: (v: string) => v.length >= 6 ? null : 'Password must be at least 6 characters',
  name: (v: string) => v.length >= 2 ? null : 'Name must be at least 2 characters',
};

export const boardSchema = {
  title: (v: string) => v.length >= 1 && v.length <= 100 ? null : 'Title must be 1-100 characters',
};

export const listSchema = {
  title: (v: string) => v.length >= 1 && v.length <= 50 ? null : 'Title must be 1-50 characters',
};

export const cardSchema = {
  title: (v: string) => v.length >= 1 && v.length <= 200 ? null : 'Title must be 1-200 characters',
  description: (v: string) => v.length <= 5000 ? null : 'Description must be at most 5000 characters',
};