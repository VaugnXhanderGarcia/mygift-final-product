import express from 'express';
import { Op } from 'sequelize';
import authorize from '../_middleware/authorize';
import { db } from '../_helpers/db';

const router = express.Router();

const ACTIVE_STATUSES = ['Pending', 'Preparing', 'Ready for Pickup'];

function includeOrderItems() {
  return [
    {
      model: db.OrderItem,
      as: 'items'
    }
  ];
}

function makeOrderCode() {
  return `MG-${Date.now()}`;
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

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Please select at least one product.'
      });
    }

    const existingActiveOrder = await db.Order.findOne({
      where: {
        customerName: cleanCustomerName,
        status: {
          [Op.in]: ACTIVE_STATUSES
        }
      },
      transaction
    });

    if (existingActiveOrder) {
      await transaction.rollback();

      return res.status(409).json({
        message: 'This customer name already has an active order. Please track the existing order first or use a different name.'
      });
    }

    let totalAmount = 0;

    const order = await db.Order.create(
      {
        orderCode: makeOrderCode(),
        customerName: cleanCustomerName,
        contactNumber,
        pickupDate,
        pickupTime,
        notes: notes || '',
        totalAmount: 0,
        status: 'Pending',
        paymentMethod: 'Pay at Counter',
        paymentStatus: 'Unpaid'
      },
      { transaction }
    );

    for (const item of items) {
      const product = await db.Product.findByPk(item.productId, { transaction });

      if (!product) {
        throw `Product not found: ${item.productName || item.productId}`;
      }

      if (product.isAvailable === false) {
        throw `Product is unavailable: ${product.name}`;
      }

      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price ?? product.price);
      const subtotal = unitPrice * quantity;

      totalAmount += subtotal;

      await db.OrderItem.create(
        {
          orderId: order.id,
          productId: product.id,
          productName: item.productName || product.name,
          quantity,
          unitPrice,
          subtotal
        },
        { transaction }
      );
    }

    order.totalAmount = totalAmount;
    await order.save({ transaction });

    await transaction.commit();

    const savedOrder = await db.Order.findByPk(order.id, {
      include: includeOrderItems()
    });

    return res.status(201).json({
      message: 'Reservation submitted successfully.',
      id: savedOrder.id,
      orderCode: savedOrder.orderCode,
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
 * PUBLIC ORDER TRACKING
 * URL: GET /orders/track/:orderCode?customerName=Juan
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
        customerName
      },
      include: includeOrderItems(),
      order: [['createdAt', 'DESC']]
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found. Please check your customer name.'
      });
    }

    return res.json(order);
  } catch (error) {
    next(error);
  }
});
router.get('/track/:orderCode', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    const customerName = String(
      req.query.customerName || req.query.name || ''
    ).trim();

    if (!orderCode || !customerName) {
      return res.status(400).json({
        message: 'Reference number and customer name are required.'
      });
    }

    const order = await db.Order.findOne({
      where: {
        orderCode,
        customerName
      },
      include: includeOrderItems()
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found. Please check your reference number and customer name.'
      });
    }

    return res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: GET ALL ORDERS
 * URL: GET /orders
 */
router.get('/', authorize, async (req, res, next) => {
  try {
    const orders = await db.Order.findAll({
      include: includeOrderItems(),
      order: [['createdAt', 'DESC']]
    });

    return res.json(orders);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE ORDER ITEM PREPARED STATUS
 * URL: PATCH /orders/:orderId/items/:itemId/prepared
 */
router.patch('/:orderId/items/:itemId/prepared', authorize, async (req, res, next) => {
  try {
    const item = await db.OrderItem.findOne({
      where: {
        id: req.params.itemId,
        orderId: req.params.orderId
      }
    });

    if (!item) {
      return res.status(404).json({
        message: 'Order item not found.'
      });
    }

    item.set('isPrepared', Boolean(req.body.isPrepared));
    await item.save();

    return res.json({
      message: 'Item preparation status updated successfully.',
      item
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE ORDER STATUS
 * URL: PUT /orders/:id/status
 */
router.put('/:id/status', authorize, async (req, res, next) => {
  try {
    const order = await db.Order.findByPk(req.params.id, {
      include: includeOrderItems()
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    const newStatus = String(req.body.status || '').trim();

    const allowedStatuses = [
      'Pending',
      'Preparing',
      'Ready for Pickup',
      'Completed',
      'Cancelled'
    ];

    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({
        message: 'Invalid order status.'
      });
    }

    order.status = newStatus;
    await order.save();

    const updatedOrder = await db.Order.findByPk(req.params.id, {
      include: includeOrderItems()
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