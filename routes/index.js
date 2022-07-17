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

router.get('/checkToken',(req,res,next)=>{
    res.json({
        code: 200,
        msg: 'token在有效期'
    })
})


router.get('/getWxewm',(req,res,next)=>{
    let vmid = req.query.vmid||''
    let url=`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=wxf1b20a65f4c39cfd&secret=8282bb1ce01f4dc045a93c8ea9edfd2a`;
    request(url, (error, response, body)=>{
        let lis = JSON.parse(body).access_token
        let baseUrl = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${lis}`;
        let json = {
            //"scene": "vmid=5821110050",
            "path": "pages/index/index?vmid="+vmid,
            "width": 200,
            "auto_color": false
        };
        request.post({
            url: baseUrl,
            form: JSON.stringify(json),
            encoding:null
        }, (err2, res2, body2) => {
            let base64Img = body2.toString('base64'); // base64图片编码字符串
            let dataBuffer = new Buffer(base64Img, 'base64');
            //保存到本地
            fs.writeFile('./public/ewm_'+vmid+'.jpg', dataBuffer, function(err) {
              if(err){
                res.json({
                    code:'444',
                    msg:'保存失败'
                })
              }else{
                console.log("保存成功！");
                res.json({
                    code:'200',
                    msg:'保存成功'
                })
              }
            });
        })
    })

})



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

function sleep(times) {
    let now = new Date();
    const exit = now.getTime() + times;
    while (true) {
        now = new Date();
        if (now.getTime() > exit) {
          return;
        }
    }
}

// 商品查询
router.post('/productList',(req,res,next)=>{
    let vmid = req.body.vmid||'5821110050';
    // 获取 并 解码
    let token = req['headers']['authorization']
    // let openid = verifyToken(token).openid || ''
    if (vmid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }

    let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
    let sign = md5('appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()

    let url = 'http://soft.kivend.net/vm/query_mcdlist_vm?appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign
    request(url, (error, response, body)=>{
        let data = JSON.parse(body)
        if (data.ret!=0 || data.itemlist.length==0) {
            return res.json({
                code: 200,
                list: [],
                msg: 'ok'
            })
        }
        let idList= []
        // let maxNumList = []
        data.itemlist.forEach(item=>{
            idList.push(item.mcdcode)
            // maxNumList.push(item.stock) // 每件商品  stock总库存    capacity 最大容量
        })

        let itemlist = data.itemlist
        
        let sql = 'select p.*, c.category_name from product p left join category c on p.category_id = c.category_id where product_id in ('+ idList.join(',') +')'
        // console.log('sql===',sql)
        db.selectAll(sql, (err, result) => { // 查询是否存在
            if (err) {
                return res.json({
                    code: '500',
                    msg: '系统错误'
                })
            }
            if (result.length>0) {
                result.forEach((obj,ii)=>{
                    for (let ooo of itemlist){
                        if(obj.product_id==ooo.mcdcode){
                            obj.maxNum = ooo.stock
                            break
                        }
                    }
                })
            }
            return res.json({
                code: 200,
                list: result,
                msg: 'ok'
            })
        })
    })
})




// 获取微信openid
router.post('/wxgetOpenId', function (req, res, next) {  
    let js_code=req.query.js_code
	let headimg=req.query.headimg
	let nickname=req.query.nickname
	let gender=req.query.gender

    let APP_URL='https://api.weixin.qq.com/sns/jscode2session'
    let APP_ID='wxf1b20a65f4c39cfd'   //小程序的app id ，在公众开发者后台可以看到
    let APP_SECRET='8282bb1ce01f4dc045a93c8ea9edfd2a'  //程序的app secrect，在公众开发者后台可以看到
	
    if(js_code){
		async.waterfall([
			function(callback){
				request(`${APP_URL}?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${js_code}&grant_type=authorization_code`, (error, response, body)=>{
					let jsons = JSON.parse(body)
					if(jsons.openid){
						callback(null, jsons.openid)
					}else{
						callback(new Error("system error"));
						return res.json({
							code: 302,
							msg: '注册失败'
						})
					}
				})
			},
			function(openid,callback){
				let sql = `select * from member where openid=? limit 1`;
				sql = db.mysql.format(sql,openid);// 预防SQL注入
				db.selectAll(sql, (err, result) => { // 查询是否存在
					if (err) {
						callback(new Error("system error"));
						return res.json({
							code: '500',
							msg: '系统错误'
						})
					}
					if (result.length == 1) { // 存在就登录小程序
						return res.json({
							code: '200',
							data:{
                                openid,
                                isOld:result[0].isOld
                            },
							msg: 'ok'
						})
					}else{
						// 插入注册用户
						let iddd = (moment().format('YYMMDDHHmm')).toString() + (Number(Math.random().toString().substr(3, 12)) + Date.now()).toString()
						let saveDate = {
							member_id: iddd,
							openid: openid,
							nickname: nickname,
							headimg: headimg,
							gender: gender,
							create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
						}
						db.insertData('member', saveDate, (err, data) => {
							if (err) {
								callback(new Error("system error"));
								return res.json({
									code: '500',
									msg: '系统错误'
								})
							}
							return res.json({
								code: '200',
								data:{openid},
								msg: 'ok'
							})
							callback('ook')
						})
					}
				})
				
			}
		], function(err, results){
			if (err) {
			   console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
			}else{
				// console.log('results',results);
			}
		})
        
    }else{
        return res.json({
            code: 302,
            msg: 'js_code参数错误'
        })
    }
})


// 用户注册
router.post('/regist', (req, res, next) => {
    let openid = req.body.openid||'';
    let nickname = req.body.nickname||''; // regist 注册   forget 找回密码
    let headimg = req.body.headimg||''; // regist 注册   forget 找回密码
    if (openid=='') { //||nickname==''
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
	let token='Bearer '+jwt.sign({
        openid,
    }, 'red exchange shopping', {
        expiresIn: '7d'
    })

    return res.json({
        code: '200',
        token,
        msg: 'ok'
    })
})


// 用户下单
router.post('/createOrder',(req,res,next)=>{
    // const openid = req.body.openid||''
    const productIds = req.body.productIds||''
    const productNums = req.body.productNums||''
    const money = req.body.money||''
    const account = req.body.account||''
    const vmid = req.body.vmid||''

    // console.log(req.body,vmid)

    // 获取 并 解码
    let token = req['headers']['authorization']
    let openid = verifyToken(token).openid || ''
    // console.log('openid=====',openid)
    if (openid=='' || productIds=='' || productNums=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    let orderNo='No'+(moment().format('YYMMDD')).toString() + Date.now().toString().substr(0,12)
    let userInfo = {}
    async.waterfall([
        function(callback){
            // console.log(1111);
            let sql=`select nickname,headimg from member where openid='${openid}' limit 1`
            db.connection.query(sql, function (err,result) {
                if (err) {
                    // console.log('系统错误',err);
                    callback(new Error("system error"));
                    return res.json({
                        code:'500',
                        msg:'系统错误'
                    })
                }
                let string = JSON.stringify(result);
                let data = JSON.parse(string);
                if(data.length==0){
                    callback(new Error("用户不存在"));
                    return res.json({
                        code:'500',
                        msg:'用户不存在'
                    })
                }else{
                    userInfo = data[0]
                    callback(null);
                }
            });
        },
        function(callback){ // 循环商品  取出价格
            let sql2=`select product_id,product_name,product_img,price from product where product_id in(${productIds})`
            db.connection.query(sql2, function (err,results) {
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code:'500',
                        msg:'系统错误'
                    })
                }
                
                let string1 = JSON.stringify(results);
                let productList = JSON.parse(string1);
                callback(null,productList);
            });
        },
        function(productList, callback){ //创建订单
            let nums=productNums.split(',');
            let totalMoney = 0
            productList.forEach((item,index)=>{
                item['num']=nums[index]
                item['order_id']=orderNo
                totalMoney += (item.price*100)*nums[index]
            })
            let saveDate = {
                order_id: orderNo,
                openid,
                nickname: userInfo.nickname,
                headimg: userInfo.headimg,
                money: parseFloat(totalMoney/100),
                create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                machine_id:vmid
            }
            db.insertData('order', saveDate, (err, data) => {
                if (err) {
                    callback(new Error("system error1"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                callback(null,productList);
            })
        },
        function(proList, callback){ // 创建订单详情
            let valAry = []
            proList.forEach((item,index)=>{
                valAry.push([ item['order_id'], item['product_id'], item['product_name'], item['product_img'], item['price'], item['num'] ])
            })

            let sql = 'INSERT INTO `order_detail`(order_id, product_id, product_name, product_img, price, num) VALUES ?'; //批量插入数据

            db.connection.query(sql, [valAry], function (err3, rows, fields) {
                if (err3) {
                    callback(new Error("system error2"));
                    return res.json({
                        code:'500',
                        msg:'系统错误'
                    })
                }
                callback(null,`订单创建成功 ${orderNo}`);
                return res.json({
                    code: '200',
                    msg: 'ok',
                    orderNo
                })
            });
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err, moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results, moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
})




function getDBList(orderNo) {
    // console.log('orderNo=',orderNo)
    return new Promise((resolve,reject)=>{
        let sql22=`select * from order_detail where order_id='${orderNo}'`
        db.connection.query(sql22, function (err,results) {
            if (err) {
                // callback(new Error("system error"));
                /*return res.json({
                    code:'500',
                    msg:'系统错误'
                })*/
            }
            resolve(results)
        })
    })
}

function getHuoDaoList(vmid){
    // let vmid = res.body.vmid
    return new Promise((resolve,reject)=>{
        let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss');
        let sign = md5('appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase();
        let url = 'http://soft.kivend.net/vm/query_vmpalist?appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign;
        request(url, (error, response, body)=>{
            let lis = JSON.parse(body).itemlist
            let huodaoList = lis.filter((item,index,array)=>item.mcdname!='未设置'&&item.pastatus=='02'&&item.stocknum>0)
            resolve(huodaoList)
        })
    })
}

function outProduct(account,vmid, huodaoObj){
    // console.log(account,vmid, huodaoObj)
    return new Promise((resolve,reject)=>{
        let id = huodaoObj.order_id.slice(0,13)+(Math.random().toString().slice(2,8))
        let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
        let sign = md5('account='+account+'&appid='+config.appid+'&busino='+ id +'&money='+huodaoObj.money+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()
        let url ='http://soft.kivend.net/krcs/busin_thirdsell?account='+account+'&appid='+config.appid+'&busino='+id+'&money='+huodaoObj.money+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign
        request(url, (error, response, body)=>{
            let res = JSON.parse(body)
            console.log('出货接口结果：',res)
            if (res.ret==0) {
                resolve(res)
            }else{
                reject('出货失败 errors')
            }
        })
    })
}

function doorOpenFun(ooo){
    request.post({
        url:`http://api.hahabianli.com/door/open`,
        form:{
            access_token: global.tokenObj.access_token,
            device_id: ooo.vmid,
            out_user_id: ooo.out_user_id,
            open_type:'OUT'
        }
    }, (error, response, body)=>{
        let jsons = JSON.parse(body) // body是string类型
        if(jsons.code === 1){
            console.log('红包转账后，开门操作--成功',moment().format('YYYY-MM-DD HH:mm:ss'))
            /*{
               "code": 1,
               "info": "success",
               "data": {
                  "activity_id": "1801081740422435",
                  "user_id": "01081609535A532751AB2DB"
               }
            }*/
            let saveDate = {
                activity_id: jsons.data.activity_id,
                red_money: 50
            }
            db.insertData('hh_order', saveDate, (err, data) => {
                if (err) {
                    callback(new Error("红包转账后hh_order订单创建失败="+data.activity_id, moment().format('YYYY-MM-DD HH:mm:ss')));
                    console.log('红包转账后hh_order订单创建失败',data.activity_id,moment().format('YYYY-MM-DD HH:mm:ss'))
                }
                // callback(null,productList);
            })
            return
        }
        if (jsons.code === 3003) {
            console.log('红包转账后，开门操作--失败失败 网络错误', jsons)
            console.log('开门操作--失败失败，重新开门',moment().format('YYYY-MM-DD HH:mm:ss'))
            doorOpenFun(ooo)
        }
    })
}

router.get('/payCallback',(req,res,next)=>{
    const orderNo = req.query.n||''
    const vmid = req.query.e||''
    const account = req.query.m||'15602606622'
    if (orderNo==''||vmid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    if (orderNo.slice(0,2) === 'VV') { // 哈哈机柜 红包转账后  调开门操作
        res.json({
            code:'200',
            msg:'回调成功'
        })
        let out_user_id = orderNo.split('-')[0];
        console.log('红包转账回调参数', orderNo, vmid, out_user_id, moment().format('YYYY-MM-DD HH:mm:ss'))
        doorOpenFun({
            out_user_id,
            vmid
        })
        return
    }else{
        async.waterfall([
            function(callback){
                // callback(null)
                // return res.json({
                //     code:'200',
                //     msg:'回调成功'
                // })
                let sql = 'select * from `order` where order_id="'+orderNo+'" and status=1 limit 1';
                db.selectAll(sql, (err, result) => { // 查询是否存在
                    if (err) {
                        callback(new Error("system error"));
                        return res.json({
                            code: '500',
                            msg: '系统错误'
                        })
                    }
                    if (result.length==1) {
                        callback(null)
                        return res.json({
                            code:'200',
                            msg:'回调成功'
                        })
                    }else{
                        callback(new Error("商品已经出库了"));
                        return res.json({
                            code:'200',
                            msg:'回调成功'
                        })
                    }
                })
            },
            async function(callback){
                let _where = {order_id:orderNo};
                let _set = {
                    status:2,
                };
                db.updateData('order',_set,_where,(err,result)=>{
                    if (err) {
                        console.log('更新订单状态失败', moment().format('YYYY-MM-DD HH:mm:ss'))
                    }
                })
            },
            async function(callback){ // 调出货接口
                let detailList = await getDBList(orderNo)
                // console.log('detailList.length===',detailList)
                for (let j = 0; j < detailList.length; j++) {
                    let item=detailList[j]
                    for (let i = 0; i < item.num; i++) {
                        let huodaoList = await getHuoDaoList(vmid);
                        let huodaoObj={}
                        for (let i = 0; i < huodaoList.length; i++) {
                            if (huodaoList[i].mcdcode==item.product_id && huodaoList[i].stocknum>0 ) {
                                // console.log(huodaoList[i].mcdcode,'价格:',huodaoList[i].paprice ,'当前货道',huodaoList[i].pacode,'总库存', huodaoList[i].stocknum)
                                huodaoObj['pacode']=huodaoList[i].pacode
                                huodaoObj={...huodaoObj,...item}
                                huodaoObj['money']=huodaoList[i].paprice
                                // console.log('huodaoObj===============',huodaoObj)
                                break
                            }
                        }
                        // console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')

                        console.log('等待商品出库',moment().format('YYYY-MM-DD HH:mm:ss'))
                        // await outProduct(account,vmid ,huodaoObj) // 调第三方下单接口
                        try{
                            await outProduct(account,vmid ,huodaoObj) // 调第三方下单接口
                        } catch(err){
                            console.log('outProduct err====',err, moment().format('YYYY-MM-DD HH:mm:ss'))
                            continue;
                        }
                        sleep(23000) // 给第三方再去调出货接口出货时间
                    }
                }
                // console.log('jjjjjjjjjjjjjjjjjjjjjjjjjjj')
                // callback(null);  异步 不需要callback了
            },
            async function(callback){
                let sql=`update member set isOld=1 where openid=(select openid from \`order\` where order_id='${orderNo}' )`
                console.log('商品已出库, 更新用户为老用户',moment().format('YYYY-MM-DD HH:mm:ss'))
                db.connection.query(sql, function (err,result) {
                    if (err) {
                        // console.log('系统错误',err);
                        callback(new Error("system error"));
                        return res.json({
                            code:'500',
                            msg:'系统错误'
                        })
                    }
                });
            }
        ], function(err, results){
            if (err) {
               console.log('err err err',err, moment().format('YYYY-MM-DD HH:mm:ss'));
            }else{
                console.log('results',results, moment().format('YYYY-MM-DD HH:mm:ss'));
            }
        });
    }
})


router.get('/getOrder',(req,res,next)=>{
    let page = req.query.page||1;
    let pageSize = req.query.pageSize||20;
    // console.log(req.query)

    // 获取 并 解码
    let token = req['headers']['authorization']
    let openid = verifyToken(token).openid || ''
    if (openid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    async.waterfall([
        function(callback){
            let sql = 'select * from `order` where openid="'+openid+'" and status=2 order by create_time desc limit ' + (page-1)*pageSize +','+pageSize;
            // sql = db.mysql.format(sql,openid);// 预防SQL注入
            db.selectAll(sql, (err, result) => { // 查询是否存在
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                callback(null,result);
            })
        },
        function(list,callback){
            let listData=list;
            for (let i = 0; i < listData.length; i++) {
                let sql2 = 'select product_name,product_img,price,num from `order_detail` where order_id="'+ listData[i].order_id+'"';
                db.selectAll(sql2, (err, subresult) => { // 查询是否存在
                    if (err) {
                        callback(new Error("system error"));
                        return res.json({
                            code: '500',
                            msg: '系统错误'
                        })
                    }
                    listData[i]['detailList']=subresult
                })
            }

            setTimeout(()=>{
                callback(null,'ok');
                return res.json({
                    code: '200',
                    list:listData,
                    msg: 'ok'
                })
            },500)
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err, moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results, moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
})

router.post('/getShopInfo',(req,res,next)=>{
    let vmid = req.body.vmid||'5821110050'
    if (vmid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    async.waterfall([
        function(callback){
            let sql = 'select * from `merchant` where machine_id='+ vmid;
            db.selectAll(sql, (err, result) => {
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                // console.log('result',result)
                if (result.length>0) {
                    callback(null,result[0]);
                }else{
                    res.json({
                        code: '200',
                        shopInfo:{},
                        msg: 'ok'
                    })
                    callback(new Error("system error"));
                }
            })
        },
        function(result,callback){
            let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
            let sign = md5('appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()
            request('http://soft.kivend.net/vm/query_vminfolist?appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign, (error, response, body)=>{
                let itemObj = JSON.parse(body).itemlist[0]
                callback(null,'ok');
                return res.json({
                    code: '200',
                    data:{...itemObj,...result},
                    msg: 'ok'
                })
            })
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            // console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
})

router.get('/getMachine',(req,res,next)=>{
    let vmid = req.query.vmid||''
    if (vmid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    async.waterfall([
        function(callback){
            let sql = 'select * from `merchant` where machine_id='+vmid+' limit 1';
            db.selectAll(sql, (err, result) => {
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                // console.log('result',result)
                if (result.length>0) {
                    callback(null,result[0]);
                }else{
                    res.json({
                        code: '200',
                        shopInfo:{},
                        msg: 'ok'
                    })
                    callback(new Error("system error"));
                }
            })
        },
        function(result,callback){
            let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
            let sign = md5('appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()
            request('http://soft.kivend.net/vm/query_vminfolist?appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign, (error, response, body)=>{
                let itemObj = JSON.parse(body).itemlist[0]
                callback(null,'ok');
                return res.json({
                    code: '200',
                    data:{...itemObj,...result},
                    msg: 'ok'
                })
            })
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            // console.log('results',results);
        }
    });
})

router.get('/signActive',(req,res,next)=>{
    if (true) {
        return res.json({
            code:'200',
            data:`<h2 style="text-align:center;margin-bottom:10px;font-size:16px">好消息，本机招募促销员领取大米</h2>
                <p style="font-weight:bold;font-size:14px">所有成功在微厅红包免费兑换大米的老用户即日起签到介绍朋友来领大米，就奖励五常大米一包</p>
                <p style="margin-top:10px">规则如下：</p>
                <p>1、个人中心 点击签到按钮，有效期1个小时，在有效期内有介绍朋友来成功领取大米，则视为任务成功，否则任务失败</p>
                <p>2、任务成功后奖励签到促销员一包大米，在个人中心 点击领取大米按钮即可，签到后2小时内有效，过期作废。</p>
                <p>3、从签到开始计算2个小时以内，您不能重复签到，请距离上次签到2个小时后 可以重新签到赚取大米</p>
                <p>4、每日签到次数不限，可以多次签到多次领取大米</p>
            `
        })
    }else{
        return res.json({
            code:'504',
            data:'',
            msg:'活动结束'
        }) 
    }
    
})

////////// 签到功能  ////////// 签到功能  ////////// 签到功能  ////////// 签到功能
router.post('/signIn',(req,res,next)=>{
    // let openid = req.query.openid||''
    let vmid = req.body.vmid||''
    let mobile = req.body.mobile||''
    // 获取 并 解码
    let token = req['headers']['authorization']
    let openid = verifyToken(token).openid || ''

    if (openid==''||vmid==''||mobile=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    let curTime=moment().format('YYYY-MM-DD HH:mm:ss')
    async.waterfall([
        function(callback){
            let sql = `select * from sign_record where vmid=${vmid} and openid='${openid}' order by startTime desc limit 1`;
            // console.log('sql==',sql)
            db.selectAll(sql, (err, result) => {
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                if (result.length>0) { // 同一个签到人
                    let obj =result[0]
                    let twoHoursLater = moment(obj.startTime).add(2,'hours').format('YYYY-MM-DD HH:mm:ss')
                    if (curTime > twoHoursLater) {
                        callback();// 同一个用户 在上一次签到的2个小时后  可以签到
                    }else{
                        callback(new Error("请2小时后重试"));
                        return res.json({
                            code: '500',
                            msg: `请于${moment(twoHoursLater).format('DD号 HH:mm:ss')}后重试`
                        })
                    }
                }else{
                    callback();// 不同的签到人  可以签到
                }
            })
        },
        function(callback){
            let sql = `select * from sign_record where vmid=${vmid} order by startTime desc limit 1`;
            // console.log('sql==',sql)
            db.selectAll(sql, (err, result) => { // 第一步 获取该机器是否有最新签到记录
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                if (result.length>0) {
                    let obj =result[0]
                    if (curTime > moment(obj.endTime).format('YYYY-MM-DD HH:mm:ss')) {
                        callback();// 最近的签到已过期 可以签到
                    }else{
                        callback(new Error(""));
                        return res.json({
                            code: '500',
                            msg: `${moment(obj.endTime).format('DD号HH:mm:ss')}后开始`
                        })
                    }
                }else{
                    callback();// 没有签到记录  可以签到
                }
            })
        },
        function(callback){
            // let signid='S'+(moment().format('YYMMDD')).toString() + Date.now().toString().substr(0,12)
            let saveDate = {
                // signid,
                openid,
                vmid,
                mobile,
                startTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                endTime: moment().add(1,'hours').format('YYYY-MM-DD HH:mm:ss')
            }
            db.insertData('sign_record', saveDate, (err, data) => {
                if (err) {
                    callback(new Error("system error1"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                callback(null);
                return res.json({
                    code:'200',
                    data: moment(saveDate.startTime).add(2,'hours').format('YYYY-MM-DD HH:mm:ss'),
                    msg:'签到成功，赶紧做任务吧'
                })
            })
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            // console.log('results',results);
        }
    });
})
////////////////////////////////////////////////////////  免费领取接口
router.post('/getFreeProduct',(req,res,next)=>{
    // 获取 并 解码
    let token = req['headers']['authorization']
    let openid = verifyToken(token).openid || ''

    if (openid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    let signObj={}
    let curTime=moment().format('YYYY-MM-DD HH:mm:ss')
    let orderNo='No'+(moment().format('YYMMDD')).toString() + Date.now().toString().substr(0,12)
    async.waterfall([
        function(callback){
            let sql = `select * from sign_record where openid='${openid}' and status=1 order by startTime desc limit 1`;
            // console.log('sql==',sql)
            db.selectAll(sql, (err, result) => {
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                // console.log('result==',result)
                if (result.length>0) { // 获取签到人的 最新签到记录
                    signObj=result[0]
                    if (moment(signObj.startTime).add(2,'hours').format('YYYY-MM-DD HH:mm:ss') < moment(curTime).format('YYYY-MM-DD HH:mm:ss')) { // 超过签到时间2小时 再来领取
                        callback(new Error("超过领取时间"));
                        return res.json({
                            code: '555',
                            msg: '已超过领取有效期，重新签到'
                        })
                    }else{
                        callback(null);
                    }
                }else{
                    callback(new Error("您没有领取资格"));
                    return res.json({
                        code: '555',
                        msg: '您没有领取资格，请签到做任务'
                    })
                }
            })
        },
        function(callback){
            let sql = `select * from \`order\` where status=2 and create_time between '${moment(signObj.startTime).format('YYYY-MM-DD HH:mm:ss')}' and '${moment(signObj.endTime).format('YYYY-MM-DD HH:mm:ss')}' order by create_time desc limit 1`;
            // console.log('sql==',sql)
            db.selectAll(sql, (err, result) => { // 第一步 获取该机器是否有最新签到记录
                if (err) {
                    callback(new Error("system error"));
                    return res.json({
                        code: '500',
                        msg: '系统错误'
                    })
                }
                // console.log('result==',result,'signObj==',signObj)
                if (result.length>0) {
                    console.log('进入出货流程',moment().format('YYYY-MM-DD HH:mm:ss'))
                    callback(null)
                    res.json({
                        code: '200',
                        msg: '领取成功，请等待出货'
                    })
                }else{
                    callback(new Error("完成推广任务才能领取"));
                    return res.json({
                        code: '500',
                        msg: '完成推广任务才能领取'
                    })
                }
            })
        },
        async function(callback){ // 调出货接口
            const vmid = signObj.vmid
            const account = signObj.mobile
            // console.log('jjjjjj=',vmid,'kkkkk',account)
            let huodaoList = await getHuoDaoList(vmid);
            let huodaoObj={
                order_id:orderNo
            }
            for (let i = 0; i < huodaoList.length; i++) {
                if (huodaoList[i].mcdcode==='6949368300237' && huodaoList[i].stocknum>0 ) {
                    // console.log(huodaoList[i].mcdcode,'价格:',huodaoList[i].paprice ,'当前货道',huodaoList[i].pacode,'总库存', huodaoList[i].stocknum)
                    huodaoObj['pacode']=huodaoList[i].pacode
                    // huodaoObj={...huodaoObj}
                    huodaoObj['money']=huodaoList[i].paprice
                    // console.log('huodaoObj===============',huodaoObj)
                    break
                }
            }
            // console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')

            console.log('等待商品出库',moment().format('YYYY-MM-DD HH:mm:ss'))
            // await outProduct(account,vmid ,huodaoObj) // 调第三方下单接口
            try{
                await outProduct(account,vmid ,huodaoObj) // 调第三方下单接口
            } catch(err){
                console.log('outProduct err====',err,moment().format('YYYY-MM-DD HH:mm:ss'))
            }
            sleep(23000)
        },
        async function(callback){
            console.log('商品已出库',moment().format('YYYY-MM-DD HH:mm:ss'))
            let _where = {id:signObj.id};
            let _set = {
                status:2
                // endTime: moment().format('YYYY-MM-DD HH:mm:ss')
            };
            db.updateData('sign_record',_set,_where,(err,result)=>{
                if (err) {
                    console.log('system error22222')
                }
            })
        },
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            // console.log('results',results);
        }
    });
})

router.get('/testWaterfall',(req,res,next)=>{
    async.waterfall([
        function(callback){
            console.log('11111')
            res.json({
                code: '200',
                msg: 'ok'
            })
            callback(null,'datajjjj')
        },
        async function(data,callback){
            console.log('2222',data)
            sleep(5000)
            console.log('sleep end')
            // callback(null,'aaa')
        },
        async function(callback){
            console.log('3333')
            // res.json({
            //     code: '200',
            //     msg: 'ok'
            // })
        },
        async function(callback){
            console.log('444')
            res.json({
                code: '200',
                msg: 'ok'
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

module.exports = router;

// UPDATE member SET isOld=1 WHERE openid in (SELECT openid from `order` WHERE `status`=2 GROUP BY openid)


