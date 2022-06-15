const express = require('express');
const router = express.Router();
const moment = require('moment');
const axios = require('axios');
const async = require('async');
const jwt = require('jsonwebtoken')
const request = require('request')
const fs = require('fs');
const config = require('../machineConfig')

const md5 = require('js-md5')

const db = require('../mysql/mysql.js');


router.post('/adminLogin', (req, res, next) => {
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
    let sql=`select * from hh_merchant where userName='` + userName +`' limit 1`
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

/*
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

    let sql = `select * from hh_merchant `

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

*/







































