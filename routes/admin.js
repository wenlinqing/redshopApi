const express = require('express');
const router = express.Router();
const moment = require('moment');
const axios = require('axios');
const async = require('async');
const jwt = require('jsonwebtoken')
const request = require('request')
const config = require('../machineConfig')
const md5 = require('js-md5')
const db = require('../mysql/mysql.js');

var superMobile = '15088889999'

function verifyToken(token) {
    // 验证 Token
    let objs = {}
    jwt.verify(token.substring(7), 'red exchange shopping', (error, decoded) => {
      if (error) {
        return objs
      }
      objs = decoded
    })
    return objs
}


// 获取 并 解码
// let token = req['headers']['authorization']
// let openid = verifyToken(token).openid || ''


router.post('/adminLogin', (req, res, next) => {
    let mobile = req.body.mobile||'';
    let password = req.body.password||'';
    if (password=='' || mobile=='') {
        return res.json({
            code:'504',
            msg:'账号或密码不能为空'
        })
        return
    }
    
    let sql=`select * from hh_merchant where mobile='` + mobile +`' limit 1`
    db.selectAll(sql, (err, result) => {
        if (err) {
            console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
        if (result.length != 0 && result[0].password != md5(password)) {
            return res.json({
                code: '444',
                msg: '登录密码错误'
            })
        }
        const token = 'Bearer ' + jwt.sign({'mobile':mobile}, 'red exchange shopping', { expiresIn: '2d' })
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
            let sqlAll=`select count(1) as total from hh_member`;
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
            let sql = `select * from hh_member order by create_time desc limit ` + (page-1)*pageSize +','+pageSize;
            db.selectAll(sql, (err, result) => {
                if (err) {
                    console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
            // console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            // console.log('results',results);
        }
    });
    
})


////////////////////////////////////////////////////////////////////////////////////////////////
// 后台 商户列表
router.post('/merchantList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;
    // let mobile = req.post.mobile||'';
    // let machine_id = req.query.machine_id||'';
    // 获取 并 解码
    let token = req['headers']['authorization']
    let mobile = verifyToken(token).mobile || ''
    if (mobile=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    if (mobile == superMobile) {
        var sql = `select mobile,machine_id,link,withdraw_account,create_time from hh_merchant `
    }else{
        var sql = `select mobile,machine_id,link,withdraw_account,create_time from hh_merchant where mobile=${mobile} `
    }

    sql +=` order by create_time desc limit ` + (page-1)*pageSize +','+pageSize;
    // sql = db.mysql.format(sql,req.body.user_id);// 预防SQL注入
    db.selectAll(sql, (err, result) => {
        if (err) {
            console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
    let password = req.body.password||'';
    let withdraw_account = req.body.withdraw_account||'';

    if(mobile==''||machine_id==''||link==''||password==''||withdraw_account==''){
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }

    let saveDate = {
        mobile,
        machine_id,
        link,
        password:md5(password),
        withdraw_account,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    }
    db.insertData('hh_merchant', saveDate, (err, data) => {
        if (err) {
            console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
    let password = req.body.password||'';
    let withdraw_account = req.body.withdraw_account||'';
    if(mobile==''||machine_id==''||link==''||password==''||withdraw_account==''){
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
        password,
        withdraw_account
    };
    db.updateData('hh_merchant',_set,_where,(err,result)=>{
        if (err) {
            console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
// 后台提现列表 ///////////////////////////////////////////////////////
router.post('/withdrawList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;
    // 获取 并 解码
    let token = req['headers']['authorization']
    let mobile = verifyToken(token).mobile || ''
    if (mobile=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    async.waterfall([
        function(callback){
            if (mobile == superMobile) {
                var sqlAll=`select count(1) as total from hh_withdraw`;
            }else{
                var sqlAll=`select count(1) as total from hh_withdraw where mobile=${mobile}`;
            }
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
            if (mobile == superMobile) {
                var sql = `select * from hh_withdraw order by create_time desc limit ${(page-1)*pageSize},${pageSize}`;
            }else{
                var sql = `select * from hh_withdraw  where mobile=${mobile} order by create_time desc limit ${(page-1)*pageSize},${pageSize}`;
            }
            // console.log(sql)
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
            // console.log('err err err',err);
        }else{
            // console.log('results',results);
        }
    });
    
})
// 后台 提现列表 添加
router.post('/withdrawAdd', (req, res, next) => {
    let money = req.body.money||'';
    // 获取 并 解码
    let token = req['headers']['authorization']
    let mobile = verifyToken(token).mobile || ''
    if (money==''||mobile=='') {
        return res.json({
            code:'444',
            msg:'参数错误'
        })
    }

    let saveDate = {
        mobile,
        money,
        withdraw_account:'wenlq0515',
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    }
    db.insertData('hh_withdraw', saveDate, (err, data) => {
        if (err) {
            console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
router.post('/orderList', (req, res, next) => {
    let page = req.body.page||1;
    let pageSize = req.body.pageSize||20;
    let order_id = req.body.order_id||'';
    // 获取 并 解码
    let token = req['headers']['authorization']
    let mobile = verifyToken(token).mobile || ''
    if (mobile=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }

    async.waterfall([
        function(callback){
            if (mobile == superMobile) {
                var sqlAll=`select count(1) as total from hh_order`;
            }else{
                var sqlAll=`select count(1) as total from hh_order where merchant_mobile=${mobile}`;
            }
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
            if (mobile == superMobile) {
                var sql=`select * from hh_order `;
                if (order_id!='') {
                    sql+=`where order_id='${order_id}'`;
                }
            }else{
                var sql=`select * from hh_order where merchant_mobile=${mobile}`;
                if (order_id!='') {
                    sql+=`and order_id='${order_id}'`;
                }
            }
            
            sql+=` order by create_time desc limit ${(page-1)*pageSize},${pageSize}`;
            // console.log('sql======',sql)
            db.selectAll(sql,(err,result)=>{
                if (err) {
                    console.log(err,moment().format('YYYY-MM-DD HH:mm:ss'))
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
            // console.log('err err err',err);
        }else{
            // console.log('results',results);
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
