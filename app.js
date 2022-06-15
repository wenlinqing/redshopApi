const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken')
const expressJWT = require('express-jwt')
const cors = require('cors')
const multer = require('multer');


const app = express();


app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
});

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(multer({dest: path.join(__dirname, '/public')}).any());//设置文件存储路径
app.use(express.static(path.join(__dirname, 'public')));



app.use(cors());//解决跨域问题
// app.use() 里面放的 expressJWT().unless()
// 注册 token 验证中间件
app.use(expressJWT({
  // 解析口令, 需要和加密的时候一致
  secret: 'red exchange shopping',
  // 加密方式: SHA256 加密方式在 express-jwt 里面叫做 HS256
  algorithms: ['HS256']
}).unless({
  // 不需要验证 token 的路径标识符
  path: [
    '/redapi/admin/login',
    '/redapi/wxgetOpenId',
    '/redapi/regist',
    '/redapi/getShopInfo',
    '/redapi/getWxewm',
    '/redapi/payCallback',
    '/redapi/productList',
    '/redapi/getMachine',
    // '/redapi/wx',
    '/redapi/signActive',
    // '/redapi/signIn',
    // '/redapi/getFreeProduct',

    '/redapi/v2/adminLogin',
    '/redapi/v2/merchantList',
    
  ]
}))

app.use(function (error, req, res, next) {
    if (error.name === 'UnauthorizedError') {   
        return res.json({
            code: 401,
            msg: 'token有误'
        })
    }else if (error.name === 'JsonWebTokenError') {   
        return res.json({
            code: 401,
            msg: 'token已过期'
        })
    }else{
        return res.json({
            code: 401,
            msg: error.message
        })
    }
});


global.HOST='https://www.hj19800.com'


app.use('/redapi/v2', require('./routes/index'));
app.use('/redapi/v2/admin', require('./routes/admin'));
// app.use('/redapi/v2', require('./routes/v2_index'));




module.exports = app;
