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
    declare owner: number;
    declare is_active: boolean;
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
        owner: {
            type: DataTypes.INTEGER,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: 1,
            allowNull: false
        },
    },
    {
        tableName: 'servers',
        createdAt: 'created_at',
        deletedAt: 'deleted_at',
        updatedAt: 'updated_at',
        paranoid: true,
        sequelize
    }
)


export default Server


export type ServerInputType = {
    name: string,
    description: string,
    ip: string,
    username: string,
    password: string,
    port: number,
}
