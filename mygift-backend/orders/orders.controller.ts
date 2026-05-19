import express from 'express';
import { db } from '../_helpers/db';

const router = express.Router();

/**
 * PUBLIC CUSTOMER ORDER
 * URL: POST http://localhost:4000/orders/public
 */
router.post('/public', async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      customerName,
      contactNumber,
      pickupDate,
      pickupTime,
      notes,
      items
    } = req.body;

    if (!customerName || !contactNumber || !pickupDate || !pickupTime) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Customer name, contact number, pickup date, and pickup time are required.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Please select at least one product.'
      });
    }

    let totalAmount = 0;

    for (const item of items) {
      totalAmount += Number(item.price) * Number(item.quantity);
    }

    const orderCode = `MG-${Date.now()}`;

const order = await db.Order.create(
  {
    orderCode,
    customerName,
    contactNumber,
    pickupDate,
    pickupTime,
    notes: notes || '',
    totalAmount,
    status: 'Pending',
    paymentMethod: 'Pay at Counter',
    paymentStatus: 'Unpaid'
  },
  { transaction }
);

    for (const item of items) {
      await db.OrderItem.create(
        {
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          unitPrice: Number(item.price),
          quantity: Number(item.quantity),
          subtotal: Number(item.price) * Number(item.quantity)
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(201).json({
  message: 'Reservation submitted successfully.',
  id: order.id,
  orderCode: order.orderCode,
  order
});
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    next(error);
  }
});

/**
 * ADMIN: GET ALL ORDERS
 * URL: GET http://localhost:4000/orders
 */
router.get('/', async (req, res, next) => {
  try {
    const orders = await db.Order.findAll({
      include: [
        {
          model: db.OrderItem,
          as: 'items'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE ORDER STATUS
 * URL: PUT http://localhost:4000/orders/:id/status
 */
router.put('/:id/status', async (req, res, next) => {
  try {
    const order = await db.Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    order.status = req.body.status || order.status;
    await order.save();

    res.json({
      message: 'Order status updated successfully.',
      order
    });
  } catch (error) {
    next(error);
  }
});

export default router;