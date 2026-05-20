import express from 'express';
import { Op, fn, col, where } from 'sequelize';
import { db } from '../_helpers/db';

const router = express.Router();

const includeItems = [
  {
    model: db.OrderItem,
    as: 'items'
  }
];

const inactiveStatuses = ['Completed', 'Cancelled'];

function normalizeName(name: string) {
  return String(name || '').trim().toLowerCase();
}

/**
 * PUBLIC CUSTOMER ORDER
 * URL: POST /orders/public
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

    const cleanCustomerName = String(customerName || '').trim();

    if (!cleanCustomerName || !contactNumber || !pickupDate || !pickupTime) {
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

    const existingActiveOrder = await db.Order.findOne({
      where: {
        [Op.and]: [
          where(fn('LOWER', col('customerName')), normalizeName(cleanCustomerName)),
          {
            status: {
              [Op.notIn]: inactiveStatuses
            }
          }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    if (existingActiveOrder) {
      await transaction.rollback();

      return res.status(409).json({
        message: `The name "${cleanCustomerName}" already has an active order. Please track your order first or wait until it is completed or cancelled.`,
        orderCode: existingActiveOrder.orderCode
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
        customerName: cleanCustomerName,
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
 * PUBLIC: TRACK ACTIVE ORDER BY CUSTOMER NAME
 * URL: GET /orders/track-by-name?customerName=Juan
 */
router.get('/track-by-name', async (req, res, next) => {
  try {
    const customerName = String(req.query.customerName || '').trim();

    if (!customerName) {
      return res.status(400).json({
        message: 'Customer name is required.'
      });
    }

    const order = await db.Order.findOne({
      where: {
        [Op.and]: [
          where(fn('LOWER', col('customerName')), normalizeName(customerName)),
          {
            status: {
              [Op.notIn]: inactiveStatuses
            }
          }
        ]
      },
      include: includeItems,
      order: [['createdAt', 'DESC']]
    });

    if (!order) {
      return res.status(404).json({
        message: 'No active order found under this customer name.'
      });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * PUBLIC: TRACK ORDER BY REFERENCE AND CUSTOMER NAME
 * URL: GET /orders/track/:orderCode?customerName=Juan
 */
router.get('/track/:orderCode', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    const customerName = String(req.query.customerName || req.query.name || '').trim();

    if (!orderCode || !customerName) {
      return res.status(400).json({
        message: 'Reference number and customer name are required.'
      });
    }

    const order = await db.Order.findOne({
      where: {
        [Op.and]: [
          { orderCode },
          where(fn('LOWER', col('customerName')), normalizeName(customerName))
        ]
      },
      include: includeItems
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found. Please check your reference number and customer name.'
      });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: GET ALL ORDERS
 * URL: GET /orders
 */
router.get('/', async (req, res, next) => {
  try {
    const orders = await db.Order.findAll({
      include: includeItems,
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE ORDER STATUS
 * URL: PUT /orders/:id/status
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