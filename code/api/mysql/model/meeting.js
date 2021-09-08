const Sequelize = require('sequelize');

const sequelize = new Sequelize('meeting', 'root', '123456', {
    host: 'localhost', // 数据库地址
    dialect: 'mysql', // 指定连接的数据库类型
    operatorsAliases: false,
    pool: {
        max: 5, // 连接池中最大连接数量
        min: 0, // 连接池中最小连接数量
        idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
    }
});

exports.Meeting = sequelize.define('meeting', {
    id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, unique: true},
    name: {
        type: Sequelize.STRING, // 指定值的类型
    },
    start_time:{
        type: Sequelize.TIME,
    },
    end_time:{
        type: Sequelize.TIME,
    },
    number: {
        type: Sequelize.INTEGER
    },
    host_id:{
        type: Sequelize.INTEGER
    },
    password:{
        type: Sequelize.STRING
    },
    status:{
        type:Sequelize.INTEGER
    }
}, {
    createdAt: false,                   // 禁止添加 createdAt 字段
    updatedAt: false,                  // 禁止添加 updatedAt 字段
    timestamps: false,               // 相当禁止了上面两项
    freezeTableName: true,        // 禁止修改标明为复数
});
