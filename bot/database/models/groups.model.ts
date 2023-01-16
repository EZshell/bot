import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "..";

class Groups extends Model<InferAttributes<Groups>, InferCreationAttributes<Groups>> {
    declare id: CreationOptional<number>;
    declare name: string
    declare servers: number[] | string;
    declare owner: number;
}

Groups.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        owner: {
            type: DataTypes.INTEGER,
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
    },
    {
        tableName: 'groups',
        createdAt: 'created_at',
        deletedAt: 'deleted_at',
        updatedAt: 'updated_at',
        paranoid: true,
        sequelize
    }
);


export default Groups



export type GroupInputType = {
    name: string,
}