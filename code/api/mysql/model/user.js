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

const User = sequelize.define('users', {
    user_id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, unique: true},
    user_name: {
        type: Sequelize.STRING, // 指定值的类型
    },
    user_password:{
        type: Sequelize.STRING,
    },
    user_email: {
        type: Sequelize.STRING
    },
    personal_meeting_id:{
        type: Sequelize.STRING
    },
    personal_meeting_password:{
        type: Sequelize.STRING
    },
}, {
    createdAt: false,                   // 禁止添加 createdAt 字段
    updatedAt: false,                  // 禁止添加 updatedAt 字段
    timestamps: false,               // 相当禁止了上面两项
    freezeTableName: true,        // 禁止修改标明为复数
});
// User.sync();

exports.addUser = function(user_name, user_password,user_email,personal_meeting_id,personal_meeting_password) {
    // 向 user 表中插入数据
    return User.create({
        user_name: user_name,
        user_password: user_password,
        user_email:user_email,
        personal_meeting_id:personal_meeting_id,
        personal_meeting_password:personal_meeting_password
    }).then(function(result){
        console.log("插入操作成功"+result);
    }).catch(function(err){
        console.log("添加数据发生错误："+err)
    });
};

exports.findByEmail = function(user_email) {
    return User.findOne({raw:true,where: {user_email:user_email
        }})
};

exports.changePassword = function(id,password){
    return User.findOne({where: {id:id
        }}).then(function(user){
        return user.update({
            user_password:password
        }).then(function(result){
            console.log("changePassword success: "+result);
        }).catch(function(err){
            console.log("更新操作出错："+err);
        });
    });
};

exports.checkPassword=function(user_email,password){
    return User.findOne({raw:true,where: {user_email:user_email
        }}).then(function(result){
        console.log("成功：" + (result.user_password===password));
        return result.user_password;
        }).catch(function(err){
            console.log("发生错误：" + err);
        });
}
