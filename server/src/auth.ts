import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const SECRET = process.env.JWT_SECRET || 'prototype-mock-secret';

export interface AuthPayload {
  id: string;
  role: 'RIDER' | 'DRIVER' | 'ADMIN';
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
  next();
}
