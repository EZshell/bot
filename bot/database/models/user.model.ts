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
    },
    is_premium: {
        type: DataTypes.BOOLEAN,
        default: 0,
    },
    is_active: {
        type: DataTypes.TINYINT,
        default: 1,
    },
    my_servers: {
        type: DataTypes.JSON,
        default: [],
    },
    last_online: {
        type: DataTypes.DATE,
    }
}
const User = sequelize.define('users', Data);

export default User