import express from 'express';
import { Op } from 'sequelize';
import authorize from '../_middleware/authorize';
import { db } from '../_helpers/db';

const router = express.Router();

function includeOrderItems() {
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
    include: includeOrderItems()
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
 * POST /orders/public
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
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || item.unitPrice || 0);
      const subtotal = unitPrice * quantity;

      totalAmount += subtotal;

      await db.OrderItem.create(
        {
          orderId: order.id,
          productId: Number(item.productId || 0),
          productName: item.productName,
          quantity,
          unitPrice,
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
 * PUBLIC: TRACK BY NAME ONLY
 * GET /orders/track-by-name?customerName=Juan
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

/**
 * PUBLIC: TRACK BY REFERENCE + NAME
 * GET /orders/track/:orderCode?customerName=Juan
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
 * GET /orders
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
 * ADMIN: UPDATE ORDER STATUS
 * PUT /orders/:id/status
 */
router.put('/:id/status', authorize, async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const order = await db.Order.findByPk(req.params.id, {
      include: includeOrderItems(),
      transaction
    });

    if (!order) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    const nextStatus = String(req.body.status || '').trim();

    const preparedItemIds = Array.isArray(req.body.preparedItemIds)
      ? req.body.preparedItemIds.map((id: any) => Number(id))
      : [];

    const bypassChecklist = req.body.bypassChecklist === true;

    const validStatuses = [
      'Pending',
      'Preparing',
      'Ready for Pickup',
      'Completed',
      'Cancelled'
    ];

    if (!validStatuses.includes(nextStatus)) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Invalid order status.'
      });
    }

    const orderItems = (order as any).items || [];
    const activeItems = orderItems.filter((item: any) => item.status !== 'Cancelled');

    if (order.status === 'Preparing' && nextStatus === 'Ready for Pickup') {
      const uncheckedItems = activeItems.filter(
        (item: any) => !preparedItemIds.includes(Number(item.id))
      );

      if (uncheckedItems.length > 0 && !bypassChecklist) {
        await transaction.rollback();

        return res.status(400).json({
          message: 'Please check all available products first, or use Bypass Continue.'
        });
      }

      /*
        Important:
        If bypassChecklist is true, this route only moves the order forward.
        It does not cancel unchecked products anymore.
        Admin can manually edit, add, or mark items as Not Available after bypass.
      */
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

    return res.json({
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

/**
 * ADMIN: ADD ITEM TO ORDER
 * POST /orders/:orderId/items
 */
router.post('/:orderId/items', authorize, async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const order = await db.Order.findByPk(req.params.orderId, { transaction });

    if (!order) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    if (order.status === 'Completed' || order.status === 'Cancelled') {
      await transaction.rollback();

      return res.status(400).json({
        message: 'You cannot add items to completed or cancelled orders.'
      });
    }

    const productName = String(req.body.productName || '').trim();
    const quantity = Number(req.body.quantity || 1);
    const unitPrice = Number(req.body.unitPrice || req.body.price || 0);

    if (!productName) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Product name is required.'
      });
    }

    if (quantity <= 0 || unitPrice < 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Quantity and price must be valid.'
      });
    }

    await db.OrderItem.create(
      {
        orderId: order.id,
        productId: Number(req.body.productId || 0),
        productName,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
        status: 'Active'
      },
      { transaction }
    );

    await recalculateOrderTotal(order.id, transaction);

    await transaction.commit();

    const updatedOrder = await getOrderWithItems(order.id);

    return res.json({
      message: 'Item added successfully.',
      order: updatedOrder
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    next(error);
  }
});

/**
 * ADMIN: UPDATE ORDER ITEM
 * PUT /orders/:orderId/items/:itemId
 */
router.put('/:orderId/items/:itemId', authorize, async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const order = await db.Order.findByPk(req.params.orderId, { transaction });

    if (!order) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    if (order.status === 'Completed' || order.status === 'Cancelled') {
      await transaction.rollback();

      return res.status(400).json({
        message: 'You cannot edit completed or cancelled orders.'
      });
    }

    const item = await db.OrderItem.findOne({
      where: {
        id: req.params.itemId,
        orderId: req.params.orderId
      },
      transaction
    });

    if (!item) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order item not found.'
      });
    }

    const productName = String(req.body.productName || item.productName).trim();
    const quantity = Number(req.body.quantity || item.quantity);
    const unitPrice = Number(req.body.unitPrice || item.unitPrice);
    const status = String(req.body.status || item.status || 'Active');

    const validItemStatuses = ['Active', 'Cancelled'];

    if (!validItemStatuses.includes(status)) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Invalid item status.'
      });
    }

    if (!productName || quantity <= 0 || unitPrice < 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'Product name, quantity, and price must be valid.'
      });
    }

    item.productName = productName;
    item.quantity = quantity;
    item.unitPrice = unitPrice;
    item.subtotal = quantity * unitPrice;
    item.status = status;

    await item.save({ transaction });

    await recalculateOrderTotal(order.id, transaction);

    await transaction.commit();

    const updatedOrder = await getOrderWithItems(order.id);

    return res.json({
      message: 'Item updated successfully.',
      order: updatedOrder
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    next(error);
  }
});

/**
 * ADMIN: MARK ITEM AS NOT AVAILABLE
 * PATCH /orders/:orderId/items/:itemId/cancel
 */
router.patch('/:orderId/items/:itemId/cancel', authorize, async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const order = await db.Order.findByPk(req.params.orderId, { transaction });

    if (!order) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    if (order.status === 'Completed' || order.status === 'Cancelled') {
      await transaction.rollback();

      return res.status(400).json({
        message: 'You cannot edit completed or cancelled orders.'
      });
    }

    const item = await db.OrderItem.findOne({
      where: {
        id: req.params.itemId,
        orderId: req.params.orderId
      },
      transaction
    });

    if (!item) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Order item not found.'
      });
    }

    item.status = 'Cancelled';
    await item.save({ transaction });

    await recalculateOrderTotal(order.id, transaction);

    await transaction.commit();

    const updatedOrder = await getOrderWithItems(order.id);

    return res.json({
      message: 'Item marked as Not Available.',
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