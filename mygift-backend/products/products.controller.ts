import express from 'express';
import authorize from '../_middleware/authorize';
import { db } from '../_helpers/db';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const products = await db.Product.findAll({ order: [['id', 'ASC']] });
    res.json(products);
  } catch (err) { next(err); }
});

router.get('/available', async (req, res, next) => {
  try {
    const products = await db.Product.findAll({ where: { isAvailable: true }, order: [['id', 'ASC']] });
    res.json(products);
  } catch (err) { next(err); }
});

router.post('/', authorize, async (req, res, next) => {
  try { res.status(201).json(await db.Product.create(req.body)); } catch (err) { next(err); }
});

router.put('/:id', authorize, async (req, res, next) => {
  try {
    const product = await db.Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await product.update(req.body);
    res.json(product);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize, async (req, res, next) => {
  try {
    const product = await db.Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) { next(err); }
});

export default router;
