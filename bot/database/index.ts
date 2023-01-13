import { Sequelize, Model, DataTypes } from 'sequelize';

const sequelize = new Sequelize(
    'ezshell',
    'ezshell',
    'FdG6FTH2aHkF5BTX',
    {
        host: '116.203.75.185',
        dialect: 'mysql'
    }
);

export default sequelize