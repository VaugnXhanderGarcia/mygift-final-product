import { Sequelize, DataTypes } from 'sequelize';

export default function orderItemModel(sequelize: Sequelize) {
  return sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      productId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      productName: {
        type: DataTypes.STRING,
        allowNull: false
      },

      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },

      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Active'
      }
    },
    {
      tableName: 'order_items',
      timestamps: false
    }
  );
}