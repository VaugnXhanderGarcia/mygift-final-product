import express from 'express';
import { Op } from 'sequelize';
import authorize from '../_middleware/authorize';
import { db } from '../_helpers/db';

const router = express.Router();

function includeItems() {
  return [
    {
      model: db.OrderItem,
      as: 'items'
    }
  ];
}

function normalizeName(name: any): string {
  return String(name || '').trim().toLowerCase();
}

function customerNameWhere(customerName: string) {
  return db.sequelize.where(
    db.sequelize.fn('LOWER', db.sequelize.col('customerName')),
    normalizeName(customerName)
  );
}

function makeOrderCode() {
  return `MG-${Date.now()}`;
}

async function getOrderWithItems(orderId: number) {
  return db.Order.findByPk(orderId, {
    include: includeItems()
  });
}

async function recalculateOrderTotal(orderId: number, transaction?: any) {
  const items = await db.OrderItem.findAll({
    where: { orderId },
    transaction
  });

  const totalAmount = items.reduce((sum: number, item: any) => {
    if (item.status === 'Cancelled') {
      return sum;
    }

    return sum + Number(item.subtotal || 0);
  }, 0);

  const order = await db.Order.findByPk(orderId, { transaction });

  if (order) {
    order.totalAmount = totalAmount;
    await order.save({ transaction });
  }

  return totalAmount;
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
      throw new Error('Customer name, contact number, pickup date, and pickup time are required.');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Please select at least one product.');
    }

    const activeExistingOrder = await db.Order.findOne({
      where: {
        status: {
          [Op.in]: ['Pending', 'Preparing', 'Ready for Pickup']
        },
        [Op.and]: [customerNameWhere(customerName)]
      },
      transaction
    });

    if (activeExistingOrder) {
      await transaction.rollback();

      return res.status(409).json({
        message: `The name "${customerName}" already has an active order. Please track your existing order first.`,
        orderCode: activeExistingOrder.orderCode
      });
    }

    const order = await db.Order.create(
      {
        orderCode: makeOrderCode(),
        customerName: String(customerName).trim(),
        contactNumber: String(contactNumber).trim(),
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

    let totalAmount = 0;

    for (const item of items) {
      const product = await db.Product.findByPk(item.productId, { transaction });

      if (!product) {
        throw new Error(`Product not found: ${item.productName || item.productId}`);
      }

      if (product.isAvailable === false) {
        throw new Error(`${product.name} is currently not available.`);
      }

      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || item.unitPrice || product.price);
      const subtotal = unitPrice * quantity;

      totalAmount += subtotal;

      await db.OrderItem.create(
        {
          orderId: order.id,
          productId: item.productId,
          productName: item.productName || product.name,
          unitPrice,
          quantity,
          subtotal,
          status: 'Active'
        },
        { transaction }
      );
    }

    order.totalAmount = totalAmount;
    await order.save({ transaction });

    await transaction.commit();

    const savedOrder = await getOrderWithItems(order.id);

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
 * PUBLIC: TRACK ORDER BY CUSTOMER NAME ONLY
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
        status: {
          [Op.in]: ['Pending', 'Preparing', 'Ready for Pickup', 'Completed']
        },
        [Op.and]: [customerNameWhere(customerName)]
      },
      order: [['createdAt', 'DESC']]
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found. Please check your customer name.'
      });
    }

    const fullOrder = await getOrderWithItems(order.id);

    res.json(fullOrder);
  } catch (error) {
    next(error);
  }
});

/**
 * PUBLIC: TRACK ORDER BY REFERENCE + NAME
 * URL: GET /orders/track/:orderCode?customerName=Juan
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
        [Op.and]: [customerNameWhere(customerName)]
      }
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found. Please check your reference number and customer name.'
      });
    }

    const fullOrder = await getOrderWithItems(order.id);

    res.json(fullOrder);
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
      include: includeItems(),
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
router.put('/:id/status', authorize, async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const order = await db.Order.findByPk(req.params.id, {
      include: includeItems(),
      transaction
    });

    if (!order) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    const nextStatus = req.body.status;
    const preparedItemIds = Array.isArray(req.body.preparedItemIds)
      ? req.body.preparedItemIds.map((id: any) => Number(id))
      : [];

    const bypassChecklist = req.body.bypassChecklist === true;

    if (!nextStatus) {
      throw new Error('Status is required.');
    }

    const validStatuses = ['Pending', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];

    if (!validStatuses.includes(nextStatus)) {
      throw new Error('Invalid order status.');
    }

    const activeItems = order.items.filter((item: any) => item.status !== 'Cancelled');

    if (order.status === 'Preparing' && nextStatus === 'Ready for Pickup') {
      const uncheckedItems = activeItems.filter(
        (item: any) => !preparedItemIds.includes(Number(item.id))
      );

      if (uncheckedItems.length > 0 && !bypassChecklist) {
        await transaction.rollback();

        return res.status(400).json({
          message: 'Please check all ordered products before moving this order to Ready for Pickup.'
        });
      }

      if (uncheckedItems.length > 0 && bypassChecklist) {
        for (const item of uncheckedItems) {
          item.status = 'Cancelled';
          await item.save({ transaction });
        }
      }
    }

    if (nextStatus === 'Cancelled') {
      for (const item of activeItems) {
        item.status = 'Cancelled';
        await item.save({ transaction });
      }
    }

    await recalculateOrderTotal(order.id, transaction);

    order.status = nextStatus;
    await order.save({ transaction });

    await transaction.commit();

    const updatedOrder = await getOrderWithItems(order.id);

    res.json({
      message: 'Order status updated successfully.',
      order: updatedOrder
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    next(error);
  }
});

export default router;