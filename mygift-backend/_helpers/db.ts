import { Sequelize } from 'sequelize';
import adminModel from '../auth/admin.model';
import productModel from '../products/product.model';
import orderModel from '../orders/order.model';
import orderItemModel from '../orders/order-item.model';

export const db: any = {};

export async function initialize() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Add your Supabase Postgres connection string.');
  }

  const useSsl = process.env.DB_SSL !== 'false';

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
  });

  db.Admin = adminModel(sequelize);
  db.Product = productModel(sequelize);
  db.Order = orderModel(sequelize);
  db.OrderItem = orderItemModel(sequelize);

  db.Order.hasMany(db.OrderItem, {
    as: 'items',
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
  });

  db.OrderItem.belongsTo(db.Order, {
    foreignKey: 'orderId'
  });

  db.Product.hasMany(db.OrderItem, {
    foreignKey: 'productId'
  });

  db.OrderItem.belongsTo(db.Product, {
    as: 'product',
    foreignKey: 'productId'
  });

  db.sequelize = sequelize;

  await sequelize.authenticate();

  // This automatically creates the tables in Supabase.
  await sequelize.sync();
}