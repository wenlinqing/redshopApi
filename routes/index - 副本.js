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

router.get('/getTest',(req,res,next)=>{
    res.json({
        code:'200',
        msg:'保存成功'
    })
})


router.get('/getWxewm',(req,res,next)=>{
    let vmid = req.query.vmid||''
    let url=`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=wxf1b20a65f4c39cfd&secret=8282bb1ce01f4dc045a93c8ea9edfd2a`;
    request(url, (error, response, body)=>{
        // console.log('body=====',body)
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
            // console.log('body2',err2, res2, body2)
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
        // console.log(error.message)
        return objs
      }
      // console.log(decoded)
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
    let vmid = req.body.vmid||'';
    // 获取 并 解码
    let token = req['headers']['authorization']
    let openid = verifyToken(token).openid || ''
    if (openid=='' || vmid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }

    let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
    let sign = md5('appid='+config.appid+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()
    // console.log(timestamp,'sign==',sign)

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
                // console.log(err)
                return res.json({
                    code: '500',
                    msg: '系统错误'
                })
            }
            if (result.length>0) {
                result.forEach((obj,ii)=>{
                    // console.log('obj====',obj)
                    for (let ooo of itemlist){
                        // console.log('ooo====',ooo)
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
	//console.log(nickname, gender, headimg)

    let APP_URL='https://api.weixin.qq.com/sns/jscode2session'
    let APP_ID='wxf1b20a65f4c39cfd'   //小程序的app id ，在公众开发者后台可以看到
    let APP_SECRET='8282bb1ce01f4dc045a93c8ea9edfd2a'  //程序的app secrect，在公众开发者后台可以看到
	
    if(js_code){
		async.waterfall([
			function(callback){
				request(`${APP_URL}?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${js_code}&grant_type=authorization_code`, (error, response, body)=>{
					//console.log(JSON.parse(body))
					let jsons = JSON.parse(body)
					if(jsons.openid){
						// return res.json({
							// code: 200,
							// data: JSON.parse(body),
							// msg: 'ok'
						// })
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
				//console.log('openid=====',openid)
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
							data:{openid},
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
			   console.log('err err err',err);
			}else{
				console.log('results',results);
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
	return
	

    let sql = `select * from member where openid=? limit 1`;
    sql = db.mysql.format(sql,openid);// 预防SQL注入
    db.selectAll(sql, (err, result) => { // 查询是否存在
        if (err) {
            // console.log(err)
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        if (result.length == 1) { // 存在就登录小程序
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
        }else{
            // 插入注册用户
            let iddd = (moment().format('YYMMDDHHmm')).toString() + (Number(Math.random().toString().substr(3, 12)) + Date.now()).toString()
            let saveDate = {
                member_id: iddd,
                openid: req.body.openid,
                nickname: req.body.nickname,
                headimg: req.body.headimg,
                gender: req.body.gender,
                create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            }
            db.insertData('member', saveDate, (err, data) => {
                if (err) {
                    // console.log(err)
                    return res.json({
                        code: '500',
                        msg: '系统错误'
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
        }
    })
})


// 用户下单
router.post('/createOrder',(req,res,next)=>{
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
                create_time: moment().format('YYYY-MM-DD HH:mm:ss')
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
                callback(null);
                return res.json({
                    code: '200',
                    msg: 'ok'
                })
            });
        },
        function(callback){ // 去查是否转赠了红包
            let urls = HOST+'/api/checkRecord?mobile='+account+'&timeout=600&money='+money
            // console.log(urls)
            try{
                request(urls, (error, response, body)=>{
                    // console.log(typeof(body),body)
                    let ddd = JSON.parse(body)
                    if (ddd.code == 200) {
                        callback(null);
                    }else{
                        callback(new Error("not send hongbao"));
                    }
                })
            }catch(errors){
                console.log('查询 红包转赠 失败')
            }
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

                    console.log('等待商品出库')
                    try{
                        await outProduct(account,vmid ,huodaoObj) // 调第三方下单接口
                    } catch(err){
                        console.log('outProduct err====',err)
                        continue
                    }
                    sleep(23000) // 给第三方再去调出货接口出货时间
                }
            }
            // console.log('jjjjjjjjjjjjjjjjjjjjjjjjjjj')
            // callback(null);  异步 不需要callback了
        },
        async function(callback){
            console.log('商品已出库')
            let _where = {order_id:orderNo};
            let _set = {
                status:2,
            };
            db.updateData('order',_set,_where,(err,result)=>{
                if (err) {
                    console.log('system error22222')
                }
                // callback(null);
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
    // let account = res.body.account
    // let vmid = res.body.vmid
    // console.log('huodaoObj===',huodaoObj)
    return new Promise((resolve,reject)=>{
        let id = huodaoObj.order_id.slice(0,13)+(Math.random().toString().slice(2,8))
        let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
        let sign = md5('account='+account+'&appid='+config.appid+'&busino='+ id +'&money='+huodaoObj.price+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()
        let url ='http://soft.kivend.net/krcs/busin_thirdsell?account='+account+'&appid='+config.appid+'&busino='+id+'&money='+huodaoObj.price+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign
        request(url, (error, response, body)=>{
            let res = JSON.parse(body)
            console.log('出货接口结果：',res)
            if (res.ret==0) {
                resolve(res)
            }else{
                reject('errors')
            }
        })
    })
}






router.post('/getOrder',(req,res,next)=>{
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
            let sql = 'select * from `order` where openid="'+openid+'" order by create_time desc';
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
           console.log('err err err',err);
        }else{
            console.log('results',results);
        }
    });
})



router.post('/getShopInfo',(req,res,next)=>{
    let vmid = req.body.vmid||''
    if (vmid=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    async.waterfall([
        function(callback){
            let sql = 'select * from `merchant`';
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
           console.log('err err err',err);
        }else{
            console.log('results',results);
        }
    });
})



module.exports = router;



