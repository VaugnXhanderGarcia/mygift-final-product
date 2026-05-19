import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../_helpers/db';

export interface AuthRequest extends Request {
  admin?: any;
}

export default async function authorize(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { id: number };
    const admin = await db.Admin.findByPk(decoded.id);
    if (!admin) return res.status(401).json({ message: 'Unauthorized' });

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
