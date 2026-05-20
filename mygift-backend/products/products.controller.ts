import express from 'express';
import authorize from '../_middleware/authorize';
import { db } from '../_helpers/db';

const router = express.Router();

/**
 * PUBLIC: GET ALL PRODUCTS
 * This returns available and unavailable products.
 */
router.get('/', async (req, res, next) => {
  try {
    const products = await db.Product.findAll({
      order: [['id', 'ASC']]
    });

    return res.json(products);
  } catch (error) {
    next(error);
  }
});

/**
 * PUBLIC: GET AVAILABLE PRODUCTS ONLY
 */
router.get('/available', async (req, res, next) => {
  try {
    const products = await db.Product.findAll({
      where: {
        isAvailable: true
      },
      order: [['id', 'ASC']]
    });

    return res.json(products);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: CREATE PRODUCT
 */
router.post('/', authorize, async (req, res, next) => {
  try {
    const product = await db.Product.create({
      name: req.body.name,
      category: req.body.category,
      description: req.body.description || '',
      price: Number(req.body.price),
      imageUrl: req.body.imageUrl || '',
      isAvailable: req.body.isAvailable !== false
    });

    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE PRODUCT AVAILABILITY ONLY
 */
router.patch('/:id/availability', authorize, async (req, res, next) => {
  try {
    const product = await db.Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found.'
      });
    }

    product.isAvailable = req.body.isAvailable === true;
    await product.save();

    return res.json({
      message: product.isAvailable
        ? 'Product is now available.'
        : 'Product is now unavailable.',
      product
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE PRODUCT
 */
router.put('/:id', authorize, async (req, res, next) => {
  try {
    const product = await db.Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found.'
      });
    }

    await product.update({
      name: req.body.name,
      category: req.body.category,
      description: req.body.description || '',
      price: Number(req.body.price),
      imageUrl: req.body.imageUrl || '',
      isAvailable: req.body.isAvailable === true
    });

    return res.json(product);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: DELETE PRODUCT
 */
router.delete('/:id', authorize, async (req, res, next) => {
  try {
    const product = await db.Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found.'
      });
    }

    await product.destroy();

    return res.json({
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;