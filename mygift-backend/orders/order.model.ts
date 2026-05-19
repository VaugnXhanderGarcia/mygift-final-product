import { Sequelize, DataTypes } from 'sequelize';

export default function orderModel(sequelize: Sequelize) {
  return sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderCode: { type: DataTypes.STRING, allowNull: false, unique: true },
    customerName: { type: DataTypes.STRING, allowNull: false },
    contactNumber: { type: DataTypes.STRING, allowNull: false },
    pickupDate: { type: DataTypes.DATEONLY, allowNull: false },
    pickupTime: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    paymentMethod: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Counter Payment' },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }
  }, { tableName: 'orders', timestamps: true });
}
