import { DataTypes } from "sequelize";
import sequelize from "..";

const Data = {
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_bot: {
        type: DataTypes.BOOLEAN,
        default: 0,
        allowNull: false
    },
    is_premium: {
        type: DataTypes.BOOLEAN,
        default: 0,
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        default: 1,
        allowNull: false
    },
    servers: {
        type: DataTypes.JSON,
        default: "[]",
    },
}

const options = {
    createdAt: 'created_at',
    deletedAt: 'deleted_at',
    updatedAt: 'updated_at',
    paranoid: true,
}
const User = sequelize.define('users', Data, options);

export default User