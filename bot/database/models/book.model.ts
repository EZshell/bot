import { DataTypes } from "sequelize";
import sequelize from "..";


const Book = sequelize.define("books", {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    },
    release_date: {
        type: DataTypes.DATEONLY,
    },
    subject: {
        type: DataTypes.INTEGER,
    }
});

export default Book