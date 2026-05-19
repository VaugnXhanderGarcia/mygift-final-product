import { DataTypes, Sequelize } from 'sequelize';

export default function AdminModel(sequelize: Sequelize) {
  return sequelize.define('Admin', {
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Admin' }
  }, {
    tableName: 'admins',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: {
      withHash: { attributes: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'] }
    }
  });
}
