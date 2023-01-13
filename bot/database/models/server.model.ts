import { DataTypes } from "sequelize";
import sequelize from "..";

const Data = {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false,
        length: 100,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        length: 100,
        default: 'root'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        length: 100,
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        length: 5,
        default: 22
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false,
        length: 100
    },

    deletedAt: {
        type: DataTypes.DATE,
    },
    createdBy: {
        type: DataTypes.INTEGER,
    },
}
const Server = sequelize.define('servers', Data);

export default Server