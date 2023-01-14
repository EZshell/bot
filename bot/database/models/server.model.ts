import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "..";

class Server extends Model<InferAttributes<Server>, InferCreationAttributes<Server>> {
    declare id: CreationOptional<number>;
    declare name: string
    declare description: string | null;
    declare ip: string;
    declare username: string;
    declare password: string;
    declare port: number;
    declare country: string;
    declare created_by: number;
}



Server.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
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
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'root'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        port: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 22
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        created_by: {
            type: DataTypes.INTEGER,
        },
    },
    {
        tableName: 'server',
        createdAt: 'created_at',
        deletedAt: 'deleted_at',
        updatedAt: 'updated_at',
        paranoid: true,
        sequelize
    }
)


export default Server


export type ServerInfoType = {
    name: string,
    description: string,
    ip: string,
    username: string,
    password: string,
    port: number,
}
