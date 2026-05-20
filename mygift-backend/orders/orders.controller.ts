import express from 'express';
import authorize from '../_middleware/authorize';
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

    if (!customerName || !contactNumber || !pickupDate || !pickupTime) {
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

    let totalAmount = 0;

    const order = await db.Order.create(
      {
        orderCode: makeOrderCode(),
        customerName,
        contactNumber,
        pickupDate,
        pickupTime,
        notes: notes || '',
        paymentMethod: 'Pay at Counter',
        status: 'Pending',
        totalAmount: 0
      },
      { transaction }
    );

    for (const item of items) {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || item.unitPrice || 0);
      const subtotal = unitPrice * quantity;

      totalAmount += subtotal;

      await db.OrderItem.create(
        {
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity,
          unitPrice,
          subtotal,
          isPrepared: false
        },
        { transaction }
      );
    }

    order.totalAmount = totalAmount;
    await order.save({ transaction });

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
 * PUBLIC CUSTOMER ORDER TRACKING
 * URL: GET /orders/track/:orderCode?contactNumber=09123456789
 */
router.get('/track/:orderCode', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    const customerName = String(req.query.customerName || '').trim();

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
      include: getIncludeItems()
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
      include: getIncludeItems(),
      order: [['createdAt', 'DESC']]
    });

    return res.json(orders);
  } catch (error) {
    next(error);
  }
});

/**
 * ADMIN: UPDATE ORDER ITEM PREPARATION CHECKBOX
 * URL: PUT /orders/:orderId/items/:itemId/prepared
 */
router.put('/:orderId/items/:itemId/prepared', authorize, async (req, res, next) => {
  try {
    const order = await db.Order.findByPk(req.params.orderId, {
      include: getIncludeItems()
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    if (order.status !== 'Preparing') {
      return res.status(400).json({
        message: 'Items can only be checked while the order is in Preparing status.'
      });
    }

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

    item.isPrepared = !!req.body.isPrepared;
    await item.save();

    const updatedOrder = await db.Order.findByPk(req.params.orderId, {
      include: getIncludeItems()
    });

    return res.json({
      message: 'Order item preparation status updated.',
      order: updatedOrder
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

    if (newStatus === 'Ready for Pickup') {
      const fullOrder = await db.Order.findByPk(order.id, {
        include: getIncludeItems()
      });

      const orderItems = fullOrder?.items || [];

      if (orderItems.length > 1) {
        const allPrepared = orderItems.every((item: any) => item.isPrepared === true);

        if (!allPrepared) {
          return res.status(400).json({
            message: 'Please check all ordered products before moving this order to Ready for Pickup.'
          });
        }
      }
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