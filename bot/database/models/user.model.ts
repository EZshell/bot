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
        default: false,
    },
    is_premium: {
        type: DataTypes.BOOLEAN,
        default: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        default: true,
    },
    my_servers: {
        type: DataTypes.JSON,
        default: [],
    }
}
const User = sequelize.define('users', Data);

export default User