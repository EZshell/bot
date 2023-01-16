import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "..";

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: CreationOptional<number>;
    declare first_name: string
    declare last_name: string | null;
    declare username: string | null;
    declare is_bot: boolean;
    declare is_premium: boolean;
    declare is_active: boolean;
    declare servers: number[] | string;
    declare snippets: number[] | string;
    declare groups: number[] | string;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
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
            defaultValue: 0,
            allowNull: false
        },
        is_premium: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: 1,
            allowNull: false
        },
        groups: {
            type: DataTypes.JSON,
            // get: function () {
            //     return JSON.parse(this.getDataValue('groups').toString());
            // },
            // set: function (value) {
            //     this.setDataValue('groups', JSON.stringify(value));
            // },
        },
        servers: {
            type: DataTypes.JSON,
            // get: function () {
            //     return JSON.parse(this.getDataValue('servers').toString());
            // },
            // set: function (value) {
            //     this.setDataValue('servers', JSON.stringify(value));
            // },
        },
        snippets: {
            type: DataTypes.JSON,
            // get: function () {
            //     return JSON.parse(this.getDataValue('snippets').toString());
            // },
            // set: function (value) {
            //     this.setDataValue('snippets', JSON.stringify(value));
            // },
        },
    },
    {
        tableName: 'users',
        createdAt: 'created_at',
        deletedAt: 'deleted_at',
        updatedAt: 'updated_at',
        paranoid: true,
        sequelize
    }
);


export default User