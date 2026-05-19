import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authorize, { AuthRequest } from '../_middleware/authorize';
import { db } from '../_helpers/db';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await db.Admin.scope('withHash').findOne({ where: { email } });
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      return res.status(400).json({ message: 'Email or password is incorrect' });
    }

    const token = jwt.sign({ id: admin.id, role: 'Admin' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    const safeAdmin = admin.get({ plain: true });
    delete safeAdmin.passwordHash;
    res.json({ ...safeAdmin, token });
  } catch (err) { next(err); }
});

router.get('/me', authorize, async (req: AuthRequest, res) => {
  res.json(req.admin);
});

router.post('/change-password', authorize, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await db.Admin.scope('withHash').findByPk(req.admin.id);
    if (!bcrypt.compareSync(currentPassword, admin.passwordHash)) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    admin.passwordHash = bcrypt.hashSync(newPassword, 10);
    await admin.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

export default router;
