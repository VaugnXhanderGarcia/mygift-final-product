import express from 'express';
import { db } from '../_helpers/db';

const router = express.Router();

function getIncludeItems() {
  return [
    {
      model: db.OrderItem,
      as: 'items'
    }
  ];
}

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

    const savedOrder = await db.Order.findByPk(order.id, {
      include: getIncludeItems()
    });

    return res.status(201).json({
      message: 'Reservation submitted successfully.',
      id: order.id,
      orderCode: order.orderCode,
      order: savedOrder
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    next(error);
  }
});

/**
 * PUBLIC: TRACK ORDER STATUS
 * URL: GET http://localhost:4000/orders/track/MG-123456789?contactNumber=09123456789
 */
router.get('/track/:orderCode', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    const contactNumber = String(req.query.contactNumber || '').trim();

    if (!orderCode || !contactNumber) {
      return res.status(400).json({
        message: 'Reference number and contact number are required.'
      });
    }

    const order = await db.Order.findOne({
      where: {
        orderCode,
        contactNumber
      },
      include: getIncludeItems()
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found. Please check your reference number and contact number.'
      });
    }

    return res.json(order);
  } catch (error) {
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
      include: getIncludeItems(),
      order: [['createdAt', 'DESC']]
    });

    return res.json(orders);
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
    const allowedStatuses = [
      'Pending',
      'Preparing',
      'Ready for Pickup',
      'Completed',
      'Cancelled'
    ];

    const order = await db.Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    const newStatus = req.body.status;

    if (!newStatus || !allowedStatuses.includes(newStatus)) {
      return res.status(400).json({
        message: 'Invalid order status.'
      });
    }

    order.status = newStatus;
    await order.save();

    const updatedOrder = await db.Order.findByPk(order.id, {
      include: getIncludeItems()
    });

    return res.json({
      message: 'Order status updated successfully.',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
});

export default router;