import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "..";

class Snippet extends Model<InferAttributes<Snippet>, InferCreationAttributes<Snippet>> {
    declare id: CreationOptional<number>;
    declare label: string
    declare script: string;
}

Snippet.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        label: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        script: {
            type: DataTypes.TEXT,
            allowNull: false
        },
    },
    {
        tableName: 'snippets',
        createdAt: 'created_at',
        deletedAt: 'deleted_at',
        updatedAt: 'updated_at',
        paranoid: true,
        sequelize
    }
);


export default Snippet



export type SnippetInputType = {
    label: string,
    script: string,
}