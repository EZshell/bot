import { DataTypes } from "sequelize";
import sequelize from "..";

const Data = {
    id: DataTypes.INTEGER,
    name: DataTypes.CHAR({ length: 256 }),
    description: DataTypes.CHAR({ length: 256 }),
    ip: DataTypes.CHAR({ length: 100 }),
    username: DataTypes.CHAR({ length: 100 }),
    password: DataTypes.CHAR({ length: 100 }),
    port: DataTypes.INTEGER({ length: 5 }),
    country: DataTypes.CHAR({ length: 50 }),

    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    deleted_by: DataTypes.DATE,

    created_by: DataTypes.INTEGER,
}
const Server = sequelize.define('servers', Data);

export default Server