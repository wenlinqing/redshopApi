const express = require('express');
const router = express.Router();
const moment = require('moment');
const axios = require('axios');
const async = require('async');
const jwt = require('jsonwebtoken')


// 图片上传用
const pathLib = require('path');
const fs = require('fs');

const db = require('../mysql/mysql.js');

/*
function verifyToken(token) {
    // 验证 Token
    let objs = {}
    jwt.verify(token.substring(7), 'red exchange shopping', (error, decoded) => {
      if (error) {
        console.log(error.message)
        return objs
      }
      console.log(decoded)
      objs = decoded
    })
    return objs
}


// 获取 并 解码
let token = req['headers']['authorization']
let openid = verifyToken(token).openid || ''


*/

router.post('/login', (req, res, next) => {
    let userName = req.body.userName||'';
    let password = req.body.password||'';
    if (password=='' || userName=='') {
        return res.json({
            code:'504',
            msg:'账号或密码不能为空'
        })
        return
    }
    // console.log('mobile',mobile)
    let sql=`select * from admin where userName='` + userName +`' limit 1`
    db.selectAll(sql, (err, result) => {
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        if (result.length == 0) {
            return res.json({
                code: '444',
                msg: '账号不存在'
            })
        }
        if (result.length != 0 && result[0].password != password) {
            return res.json({
                code: '444',
                msg: '登录密码错误'
            })
        }
        const token = 'Bearer ' + jwt.sign({'userName':userName}, 'red exchange shopping', { expiresIn: '2d' })
        res.json({
            code: '200',
            token,
            msg: 'ok'
        })
    })
})



// 后台用户列表 ///////////////////////////////////////////////////////
router.post('/memberList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;

    async.waterfall([
        function(callback){
            let sqlAll=`select count(1) as total from member`;
            db.selectAll(sqlAll,(err,result)=>{
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'500',
                        msg:'系统错误'
                    })
                }
                let total=result[0].total;

                if (total==0) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'200',
                        page:page,
                        pageSize:pageSize,
                        totals:total,
                        list:[],
                        msg:'ok'
                    })
                }else{
                    callback(null, total)
                }
            })
        },
        function(total, callback){
            let sql = `select * from member order by create_time desc limit ` + (page-1)*pageSize +','+pageSize;
            db.selectAll(sql, (err, result) => {
                if (err) {
                    console.log(err)
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                callback()
                return res.json({
                    code:'200',
                    page:page,
                    pageSize:pageSize,
                    totals:total,
                    list:result,
                    msg:'ok'
                })
            })
        }
    ], function(err, results){
        if (err) {
            console.log('err err err',err);
        }else{
            console.log('results',results);
        }
    });
    
})


////////////////////////////////////////////////////////////////////////////////////////////////
// 后台 商户列表
router.post('/merchantList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;
    let mobile = req.body.mobile||'';
    let machine_id = req.body.machine_id||'';

    let sql = `select * from merchant `

    if(mobile !='' ){
        sql +=` where mobile=` + mobile
    }

    sql +=` order by create_time desc limit ` + (page-1)*pageSize +','+pageSize;

    // sql = db.mysql.format(sql,req.body.user_id);// 预防SQL注入
    db.selectAll(sql, (err, result) => {
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        res.json({
            code: '200',
            msg: 'ok',
            page,
            pageSize,
            list:result,
        })
    })
})

// 后台 商户添加
router.post('/merchantAdd', (req, res, next) => {

    let mobile = req.body.mobile||'';
    let machine_id = req.body.machine_id||'';
    let link = req.body.link||'';

    if(mobile==''||machine_id==''||link==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }

    let saveDate = {
        mobile,
        machine_id,
        link,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    }
    db.insertData('merchant', saveDate, (err, data) => {
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        return res.json({
            code: '200',
            msg: 'ok'
        })
    })
})

// 后台 商户 更新
router.post('/merchantUpdate', (req, res, next) => {
    let mobile = req.body.mobile||'';
    let machine_id = req.body.machine_id||'';
    let link = req.body.link||'';

    if(mobile==''||machine_id==''||link==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }

    let _where = {machine_id};
    let _set = {
        mobile,
        machine_id,
        link,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    db.updateData('merchant',_set,_where,(err,result)=>{
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        return res.json({
            code: '200',
            msg: 'ok'
        })
    })
})

// 后台 商户 删除
router.post('/merchantDelete', (req, res, next) => {
    let machine_id = req.body.machine_id||'';
    if(machine_id==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    db.deleteData('merchant','machine_id',machine_id,(err,data)=>{
        if (err) {
            console.log(err)
            return res.json({
                code:'500',
                msg:'系统错误'
            })
        }
        res.json({
            code:'200',
            msg:'ok'
        })
    })
})


/////////////////////////////////////////////////////////////////////////////////////////////////////

// 后台 商品分类  列表
router.post('/categoryList', (req, res, next) => {
    let sql = `select * from category`
    db.selectAll(sql, (err, result) => {
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        res.json({
            code: '200',
            msg: 'ok',
            list:result,
        })
    })
})
// 后台 商品分类  添加
router.post('/categoryAdd', (req, res, next) => {
    let category_name = req.body.category_name||'';
    if( category_name=='' ){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }

    let sql = `select category_name from category where category_name='`+category_name+`' limit 1`;
    // sql = db.mysql.format(sql,req.body.user_id);// 预防SQL注入
    db.selectAll(sql, (err, result) => {
        if (err) {
            return res.json({
                code: '501',
                msg: '系统错误'
            })
        }
        if (result.length == 0) {
            let saveDate = {
                'category_name':category_name,
            }
            db.insertData('category', saveDate, (err, data) => {
                if (err) {
                    return res.json({
                        code: '502',
                        msg: '系统错误'
                    })
                }
                return res.json({
                    code: '200',
                    msg: 'ok'
                })
            })
        }else{
            return res.json({
                code: '500',
                msg: '该分类已存在'
            })
        }
    })
})
// 后台 商品分类  修改
router.post('/categoryUpdate', (req, res, next) => {
    let category_id = req.body.category_id||'';
    let category_name = req.body.category_name||'';
    if( category_name=='' || category_id=='' ){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }

    let _where = {category_id};
    let _set = {
        category_name
    };
    db.updateData('category',_set,_where,(err,result)=>{
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        return res.json({
            code: '200',
            msg: 'ok'
        })
    })
})

// 后台 商品分类 删除
router.post('/categoryDelete', (req, res, next) => {
    let category_id = req.body.category_id||'';
    if(category_id==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    db.deleteData('category','category_id',category_id,(err,data)=>{
        if (err) {
            console.log(err)
            return res.json({
                code:'500',
                msg:'系统错误'
            })
        }
        res.json({
            code:'200',
            msg:'ok'
        })
    })
})


////////////////////////////////////////////////////////////////////////////////////////////////////////
// 后台 商品  列表
router.post('/productList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;
    let product_name = req.body.product_name||'';


    async.waterfall([
        function(callback){
            let sqlAll=`select count(1) as total from product`;
            db.selectAll(sqlAll,(err,result)=>{
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'500',
                        msg:'系统错误'
                    })
                }
                let total=result[0].total;

                if (total==0) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'200',
                        page:page,
                        pageSize:pageSize,
                        totals:total,
                        list:[],
                        msg:'ok'
                    })
                }else{
                    callback(null, total)
                }
            })
        },
        function(total, callback){
            var sql=`select p.*, c.category_name from product p left join category c on p.category_id = c.category_id `;
            if (product_name!='') {
                sql+=`where product_name like '%${product_name}%'`;
            }
            sql+=` order by create_time desc limit ${ (page-1)*pageSize },${pageSize}`;
            // console.log('sql======',sql)

            db.selectAll(sql,(err,result)=>{
                if (err) {
                    console.log(err)
                    return res.json({
                        code:'500',
                        msg:'系统错误'
                    })
                }
                callback()
                return res.json({
                    code:'200',
                    page:page,
                    pageSize:pageSize,
                    totals:total,
                    list:result,
                    msg:'ok'
                })
            })
        }
    ], function(err, results){
        if (err) {
            console.log('err err err',err);
        }else{
            console.log('results',results);
        }
    });
})

router.post('/queryById',(req,res,next)=>{
    let product_id = req.body.product_id||''
    if( product_id==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    let sql=`select * from product where product_id=`+product_id;
    db.selectAll(sql,(err,result)=>{
        if (err) {
            console.log(err)
            return res.json({
                code:'500',
                msg:'系统错误'
            })
        }
        res.json({
            code:'200',
            data:result[0],
            msg:'ok'
        })
    })
})


// 后台 商品  添加
router.post('/productAdd', (req, res, next) => {
    let category_id = req.body.category_id||'';
    let product_id = req.body.product_id||'';
    let product_name = req.body.product_name||'';
    let product_img = req.body.product_img||'';
    let price = req.body.price||'';
    if( category_id==''||product_id==''||product_name=='' || product_img==''|| price=='' ){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    let saveDate = {
        category_id,
        product_id,
        product_name,
        product_img,
        price,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    }
    db.insertData('product', saveDate, (err, data) => {
        if (err) {
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        return res.json({
            code: '200',
            msg: 'ok'
        })
    })
})
// 后台 商品  修改
router.post('/productUpdate', (req, res, next) => {
    let id = req.body.id||'';
    let category_id = req.body.category_id||'';
    let product_id = req.body.product_id||'';
    let product_name = req.body.product_name||'';
    let product_img = req.body.product_img||'';
    let price = req.body.price||'';
    if( category_id==''||product_id==''||product_name=='' || product_img==''|| price=='' ){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    // console.log(req.body)
    // return
    let _where = {id};
    let _set = {
        category_id,
        product_id,
        product_name,
        product_img,
        price,
    };
    db.updateData('product',_set,_where,(err,result)=>{
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        return res.json({
            code: '200',
            msg: 'ok'
        })
    })
})

// 后台 商品 删除
router.post('/productDelete', (req, res, next) => {
    let id = req.body.id||'';
    if(id==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    db.deleteData('product','id',id,(err,data)=>{
        if (err) {
            console.log(err)
            return res.json({
                code:'500',
                msg:'系统错误'
            })
        }
        res.json({
            code:'200',
            msg:'ok'
        })
    })
})



router.post('/upLoads', (req, res, next) => {
    let newFileName = null;
    let ext = pathLib.parse(req.files[0].originalname).ext;
    let oldPath = req.files[0].path;
    let newPath = req.files[0].path + ext;
    newFileName = req.files[0].filename + ext;
    fs.rename(oldPath, newPath, function (err) {
        if (err) {
            res.json({
                code: '400',
                msg: '上传失败'
            })
        } else {
            res.json({
                code: '200',
                newFileName: newFileName,
                msg: 'ok'
            })
        }
    })
})


// 后台 系统账号  列表
router.post('/adminList', (req, res, next) => {
    let sql = `select * from admin`
    db.selectAll(sql, (err, result) => {
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        res.json({
            code: '200',
            msg: 'ok',
            list:result,
        })
    })
})
// 后台 系统账号  修改
router.post('/adminUpdate', (req, res, next) => {
    let id = req.body.id||'';
    let userName = req.body.userName||'';
    let password = req.body.password||'';
    if( id ==''||userName==''||password=='' ){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    // console.log(req.body)
    // return
    let _where = {id};
    let _set = {
        userName,
        password,
    };
    db.updateData('admin',_set,_where,(err,result)=>{
        if (err) {
            console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        return res.json({
            code: '200',
            msg: 'ok'
        })
    })
})



////////////////////////////////////////////////////////////////////////////////////////////////////////
// 后台 商品  列表
router.post('/orderList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;
    let order_id = req.body.order_id||'';

    async.waterfall([
        function(callback){
            let sqlAll='select count(1) as total from `order`';
            db.selectAll(sqlAll,(err,result)=>{
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'500',
                        msg:'系统错误1'
                    })
                }
                let total=result[0].total;

                if (total==0) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'200',
                        page:page,
                        pageSize:pageSize,
                        totals:total,
                        list:[],
                        msg:'ok'
                    })
                }else{
                    callback(null, total)
                }
            })
        },
        function(total, callback){
            var sql='select * from `order` ';
            if (order_id!='') {
                sql+=`where order_id='${order_id}'`;
            }
            sql+=` order by create_time desc limit ${ (page-1)*pageSize },${pageSize}`;
            // console.log('sql======',sql)

            db.selectAll(sql,(err,result)=>{
                if (err) {
                    console.log(err)
                    return res.json({
                        code:'500',
                        msg:'系统错误2'
                    })
                }
                callback()
                return res.json({
                    code:'200',
                    page:page,
                    pageSize:pageSize,
                    totals:total,
                    list:result,
                    msg:'ok'
                })
            })
        }
    ], function(err, results){
        if (err) {
            console.log('err err err',err);
        }else{
            console.log('results',results);
        }
    });
})
















// 退出登录
router.post('/loginOut', (req, res, next) => {
    res.json({
        code: '200',
        msg: 'ok'
    })
})


module.exports = router;
