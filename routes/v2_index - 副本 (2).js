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
const schedule = require('node-schedule');


const { sha256SignVerify,decryptoFun, wxRequestHeader} = require('./sha256Sign.js')

// 开门柜小程序
const appid='wx4a00d1947cb7b08a'
const secret='a78f7cf4de71500e2e9901b45f4b5fcf'

// 哈哈便利提供给商户
const app_id='2206102201460062'
const app_secret='1802802ff6aaf3ed9f611d1dcdaa8cef'


// access_token: '16edf695b24ce679f8477d1c227503caa4bca993',
//   ticket: '5f0f442c8c63cee7dfd2f23da60e7baa',
//   exprire: 1659247301

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
function verifyToken(token) {// 验证 Token
    let objs = {}
    jwt.verify(token.substring(15), 'red exchange shopping', (error, decoded) => {
      if (error) {
        return objs
      }
      objs = decoded
    })
    return objs
}
function getRandomSixDigit(){
	let code = ''
	for(var i=0;i<6;i++){
		code += parseInt(Math.random()*10)
	}
	return code
}

function objKeySort(obj, type='asc'){
	if(type == 'asc'){
		var newkey = Object.keys(obj).sort()
	}else{
		var newkey = Object.keys(obj).sort().reverse()
	}
	let newObj={}
	for(let k of newkey){
		if (typeof(obj[k]) == 'object') {
			newObj[k] = JSON.stringify(obj[k])
		}else{
			newObj[k] = obj[k]
		}
	}
	return newObj;
}
//  哈哈零售系统 签名方式
function signMd5(obj){
	let newObj= JSON.parse(JSON.stringify(obj))
	delete newObj.sign
	let newBBB=objKeySort(newObj)
	let connects = '';
	for (let k in newBBB) {
	    connects += k+'='+ encodeURIComponent(newBBB[k])+'&';
	}
	connects=connects.substring(0,connects.length-1)+global.tokenObj.ticket
	// console.log('connects=', connects)
	return md5(connects)
}

// 微信支付分 签名方式  属性值为空 不参与签名
function signFun(data={}){
	// let key = 'C8FtQyLF35dYu6XFajbISvR82p4DPWwP';//APIv2的密钥
	let newObj = objKeySort(data);
	let connects = '';
	for (let item in newObj) {
		if(newObj[item]&&newObj[item]!=''){ // 非空参数
			connects += item+'='+ newObj[item]+'&';
		}
	}
	connects += "key="+global.MCHOBJ.APIv2; //注：key为商户平台设置的密钥key
	console.log('拼接格式后', connects);
	return md5(connects).toUpperCase();
}

// 定时任务 更新access_token 定时任务 更新access_token 定时任务 更新access_token
function secondFun(){
	var executeTime = new Date(global.tokenObj.exprire*1000);
	executeTime.setMinutes(executeTime.getMinutes()-1, executeTime.getSeconds(), 0) // 加 一分钟
	schedule.scheduleJob(executeTime, function(){
		request.post({
			url:`http://api.hahabianli.com/token/get`,
			form:{
				app_id,
				app_secret,
				rand_str: getRandomSixDigit()
			}
		}, (error, response, body)=>{
			let jsons = JSON.parse(body) // body是string类型
			if(jsons.code === 1){
				console.log('jsons.data====',jsons.data,moment().format('YYYY-MM-DD HH:mm:ss'))
				global.tokenObj.access_token=jsons.data.access_token
				global.tokenObj.ticket=jsons.data.ticket
				global.tokenObj.exprire=jsons.data.exprire
			}else{

			}
		})
	 	secondFun()
	});
}
secondFun()


router.get('/checkToken',(req,res,next)=>{
    res.json({
        code: 200,
        msg: 'token在有效期'
    })
})

router.get('/getWxewm',(req,res,next)=>{
    let vmid = req.query.vmid||''
    let url=`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    request(url, (error, response, body)=>{
        let lis = JSON.parse(body).access_token
        let baseUrl = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${lis}`;
        let json = {
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
            fs.writeFile('./public/ewm_v2_'+vmid+'.jpg', dataBuffer, function(err) {
              if(err){
                res.json({
                    code:'444',
                    msg:'保存失败'
                })
              }else{
                res.json({
                    code:'200',
                    msg:'保存成功'
                })
              }
            });
        })
    })
})


// 获取微信openid
router.post('/wxgetOpenId', function (req, res, next) {  
    let js_code=req.query.js_code
	let headimg=req.query.headimg
	let nickname=req.query.nickname
    let APP_URL='https://api.weixin.qq.com/sns/jscode2session'
    if(js_code){
		async.waterfall([
			function(callback){
				request(`${APP_URL}?appid=${appid}&secret=${secret}&js_code=${js_code}&grant_type=authorization_code`, (error, response, body)=>{
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
				let sql = `select user_id,isOld from hh_member where openid=? limit 1`;
				sql = db.mysql.format(sql,openid);// 预防SQL注入
				db.selectAll(sql, (err, result) => { // 查询是否存在
					if (err) {
						callback(new Error("system error"));
						return res.json({
							code: '500',
							msg: '系统错误'
						})
					}
					// console.log('result === result', result)
					if (result.length == 1) { // 存在就登录小程序
						return res.json({
							code: '200',
							data:{
                                openid,
                                user_id:result[0].user_id,
                                isOld:result[0].isOld
                            },
							msg: 'ok'
						})
					}else{
						// 插入注册用户
						let iddd = 'VV'+(moment().format('YYMMDDHHmm')).toString() + (Number(Math.random().toString().substr(3, 10)) + Date.now()).toString()
						let saveDate = {
							user_id:iddd,
							openid: openid,
							nickname: nickname,
							headimg: headimg,
							create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
						}
						db.insertData('hh_member', saveDate, (err, data) => {
							if (err) {
								callback(new Error("system error"));
								return res.json({
									code: '500',
									msg: '系统错误'
								})
							}
							return res.json({
								code: '200',
								data:{openid,user_id:iddd,isOld:0},
								msg: 'ok'
							})
							callback('ook')
						})
					}
				})
				
			}
		], function(err, results){
			if (err) {
			   // console.log('err err err',err);
			}else{
				console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
			}
		})
        
    }else{
        return res.json({
            code: 302,
            msg: 'js_code参数错误'
        })
    }
})

// 用户登录
router.post('/login', (req, res, next) => {
    let openid = req.body.openid||'';
    if (openid=='') {
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    let token='Bearer '+jwt.sign({
        openid,
    }, 'red exchange shopping', {
        expiresIn: '15d'
    })

    return res.json({
        code: '200',
        token,
        msg: 'ok'
    })
})

router.get('/getMachineInfo',(req,res,next)=>{
    let vmidV2 = req.query.vmidV2||''
    if (vmidV2=='') {
        return res.json({
            code:'504',
            msg:'参数错误'
        })
    }
    let sql = `select mobile,machine_id,link from hh_merchant where machine_id='${vmidV2}' limit 1`;
    db.selectAll(sql, (err, result) => {
        if (err) {
            return res.json({
                code: '500',
                msg: '系统错误'
            })
        }
        res.json({
            code: '200',
            data:result[0],
            msg: 'ok'
        })
    })
})


// 设备可售商品列表
router.get('/getProductsListByDeviceId', (req, res, next) => {
    let device_id = req.query.device_id||'';
    if (device_id=='') {
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
	request.post({
		url:`http://api.hahabianli.com/product/getProductsListByDeviceId`,
		form:{
			access_token:global.tokenObj.access_token,
			device_id
		},
		json:true
	}, (error, response, body)=>{
		// let jsons = JSON.parse(body) // body是string类型
		console.log('body===dddd', body)
		if(body.code === 1){
			return res.json({
		        code: '200',
		        data:body.data.info,
		        msg: 'ok'
		    })
		}else{
			return res.json({
				code,
				msg: body.info
			})
		}
	})
})

// 检查设备状态  data: { device_id: 'B30874', is_online: '1' }
router.post('/getDeviceStatus', (req, res, next) => {
    let device_id = req.body.device_id||'';
    if (device_id=='') {
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    async.waterfall([
        function(callback){
            request.post({
				url:`http://api.hahabianli.com/device/getDeviceOnlineStatus`,
				form:{
					access_token:global.tokenObj.access_token,
					device_id
				},
				json:true
			}, (error, response, body)=>{
				if(body.code === 1){
					callback(null, body.data.is_online)
				}else{
					callback(new Error('设备异常，稍后再试'))
					return res.json({
						code: 2002,
						msg: '设备异常，稍后再试'
					})
				}
			})
        },
        function(is_online, callback){
        	request.post({
				url:`http://api.hahabianli.com/device/checkstatus`,
				form:{
					access_token:global.tokenObj.access_token,
					device_id
				},
				json:true
			}, (error, response, body)=>{
				if(body.code === 1){
					body.data.is_online=is_online
					callback(null, JSON.stringify(body.data))
					return res.json({
				        code: '200',
				        data:body.data,
				        msg: 'ok'
				    })
					// {
					//   code: 1,
					//   info: 'SUCCESS',
					//   data: { device_id: 'B30874', status: 2, device_status: '1' }
					// }
				    //status 1.开 2.关3.无法获取4.异常
				    //device_status 1.正常 2.冻结3.学习4.异常
				}else{
					callback(new Error('设备异常，稍后再试'))
					return res.json({
						code,
						msg: body.info
					})
				}
			})
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
	
})

// 哈哈零售开门回调通知接口
router.post('/hahaDeviceCallBack', (req, res, next) => {
	let data=req.body
	let {sign} = data
	console.log(sign === signMd5(data),'haha Device CallBack',data,'\n')
	// if (sign === signMd5(data)) {
	res.send('success')

	/*if (data.status === 'CLOSED' && data.open_type ==='OUT') {
		setTimeout(()=>{
			let sql = `select out_order_no,status from hh_order where activity_id=${data.activity_id} limit 1`;
            db.selectAll(sql, (err, result) => { // 查询是否存在
                if (err) {
                    callback(new Error("system error"));
                    console.log('查询hh_order失败',moment().format('YYYY-MM-DD HH:mm:ss'))
                }
                if (result.length!=0 && result[0].status==0) {
                    cancelOrder(result[0].out_order_no)
                }
            })
		},60000)
	}*/
})

function cancelOrder(out_order_no){
	let data={
		"appid":appid,
		"service_id":global.MCHOBJ.service_id,
		"reason":"无效订单"
	}
	// console.log(JSON.stringify(data))
	let headers= wxRequestHeader('POST',`/v3/payscore/serviceorder/${out_order_no}/cancel`,JSON.stringify(data))
	request.post({
		url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder/${out_order_no}/cancel`,
		body:data,
		json:true,
		headers,
	}, (error, response, body)=>{
		console.log('jsons===',  body)
		if (verifyWxSign(response, JSON.stringify(body)) && body?.out_order_no) {
			console.log('订单已失效==',verifyWxSign(response, JSON.stringify(body)), moment().format('YYYY-MM-DD HH:mm:ss'))

			let _where = {out_order_no:out_order_no};
	        let _set = {
	            status:3
	        };
	        db.updateData('hh_order',_set,_where,(err,result)=>{
	            if (err) {
	                console.log('system error22222')
	            }
	            console.log('订单已取消 out_order_no=', out_order_no)
	        })
		}
	})
}


// 哈哈零售订单回调接口
router.post('/hahaOrderCallBack', (req, res, next) => {
	let data=req.body
	let {sign} = data
	console.log(sign === signMd5(data),'haha Order CallBack',data,'\n')
	// if (sign === signMd5(data)) {
	res.send('success')
	let subDataObj=null
	let valAry = []
	async.waterfall([
		function(callback){// 查询是否已存在
        	let sql = `select activity_id from hh_order where activity_id='${data.activity_id}' limit 1`;
            db.selectAll(sql, (err, result) => { 
                if (err) {
                    console.log(err,'查询hh_order失败4',moment().format('YYYY-MM-DD HH:mm:ss'))
                    return callback(new Error("system error"));
                }
                if (result.length!=0) {
                    callback(null)
                }else{
                    return callback(new Error("查询hh_order 订单不存在",data.activity_id));
                }
            })
        },
        function(callback){// 更新订单 商品信息 及 状态
            let _where = {activity_id:data.activity_id};
	        let _set = {
	            order_id:data.order_id,
	            order_name:data.order_name,
	            order_money:data.order_money,
	            status:1
	        };
	        db.updateData('hh_order',_set,_where,(err,result)=>{
	            if (err) {
	                console.log('hh_order 数据更新失败222',moment().format('YYYY-MM-DD HH:mm:ss'))
	                return callback(new Error("hh_order 数据更新失败222"));
	                
	            }
	            callback(null)
	        })
        },
        function(callback){
            JSON.parse(data.order_goods).forEach((item,index)=>{
				valAry.push([ data.order_id,item['code'],item['id'],item['product_name'],item['product_num'],item['price'] ])
			})
            let sql = 'INSERT INTO hh_order_detail(order_id, code, product_id, product_name, product_num, price) VALUES ?'; //批量插入数据
            // console.log('sql====', sql)
            db.connection.query(sql, [valAry], function (err3, rows, fields) {
                if (err3) {
                    console.log('errrrrr',err3)
                    return callback(new Error("system error2"));
                }else{
                	callback(null);
                }
            });
        },
        function(callback){
        	console.log('此处调结算  完结支付分订单接口')
        	// 先查询订单类型
        	let sql = `select out_order_no,buyWay,red_money from hh_order where activity_id='${data.activity_id}' limit 1`;
            db.selectAll(sql, (err, result) => { // 查询是否存在
                if (err) {
                    console.log(err,'查询hh_order失败4',moment().format('YYYY-MM-DD HH:mm:ss'))
                    return callback(new Error("system error"));
                }
                if (result.length!=0) {
                    callback(null)
                    subDataObj= result[0]
                }else{
                    return callback(new Error("查询hh_order失败5"));
                }
            })
        },
        function(callback){// 查询对应机器是否有 红包转账兑换的商品
        	let sql = `select product_id from hh_product where device_id='${data.device_id}' limit 1`;
            db.selectAll(sql, (err, result) => { 
                if (err) {
                    console.log(err,'查询hh_order失败4',moment().format('YYYY-MM-DD HH:mm:ss'))
                    return callback(new Error("system error"));
                }
                if (result.length==0) {
                    callback(null,'') // 没有红包转账兑换的商品
                }else{
                    callback(null,result[0].product_id)
                }
            })
        },
        function(product_id,callback){
        	let total_amount = data.order_money*100
        	let post_discounts=[]
        	let hasRed=false
        	if (product_id!='') {
        		for(let oss of valAry){ // ['2207301259047062', 'hjdywcdm500g','26019', '韩家大院五常大米500g', 1, 10]
	        		if (oss.includes(product_id)) {
	        			hasRed=true;
	        			break
	        		}
	        	}
        	}
        	if (subDataObj.buyWay == 'red' && hasRed) {
        		total_amount -= subDataObj.red_money*0.2*100 // 每包大米 50红包=10元 转成分
        		post_discounts.push({
        			"name":"红包转账购物商品",
        			"description":"不与参与扣费",
        			"amount":subDataObj.red_money*0.2*100, // 转成分
        		})
        	}
        	console.log('valAry==',valAry)
	      	console.log(subDataObj, '是否有红包转账兑换的商品==',hasRed,post_discounts,moment().format('YYYY-MM-DD HH:mm:ss'))

        	let post_payments=JSON.parse(data.order_goods).map(item=>{
        		return {
        			"name": item.product_name,
        			"amount": item.money*100,// 单个商品小计金额 转成分
        		}
        	})

        	console.log('应付金额total_amount=',total_amount,'post_payments==',JSON.stringify(post_payments))

            let budyData={
				"appid":appid,
				"service_id":global.MCHOBJ.service_id,
				"time_range":{
					"end_time":moment().format('YYYYMMDDHHmmss') 
					// 创建订单未填写服务结束时间，则完结的时候，服务结束时间必填
				},
				post_discounts,
				post_payments,
				total_amount
			}
			console.log('budyData====',budyData)
			let headers= wxRequestHeader('POST',`/v3/payscore/serviceorder/${subDataObj.out_order_no}/complete`,JSON.stringify(budyData))
			request.post({
				url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder/${subDataObj.out_order_no}/complete`,
				body:budyData,
				json:true,
				headers,
			}, (error, response, body)=>{
				if (body.state === 'DOING') {
					// console.log('支付完成 verifyWxSign(response, body)',verifyWxSign(response, JSON.stringify(body)))
					console.log('支付完成 verifyWxSign(response, body)', body)
				}else{
					console.log(subDataObj.out_order_no,'支付错误信息=',body, moment().format('YYYY-MM-DD HH:mm:ss'))
				}
			})
        },
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
	// }else{
	// 	res.send('fail')
	// }
})

function queryRedProduct(device_id){ // 本系统  查询设备添加的 红包兑换 商品价格
	return new Promise((resolve,reject)=>{
		let sql = `select redPrice from hh_product where device_id='${device_id}' limit 1`;
	    db.selectAll(sql, (err, result) => { // 查询是否存在
	        if (err) {
	            console.log('查询hh_product失败',moment().format('YYYY-MM-DD HH:mm:ss'))
	            reject(err)
	        }
	        resolve(result)
	    })
	})
}


// 微信订单确认或支付结果回调接口
router.post('/wxPayCallBack', async (req, res, next) => {
	let dataObj=req.body
	console.log('wxPayCallBack', dataObj)
	let resultObj = decryptoFun(dataObj.resource.ciphertext,dataObj.resource.nonce,dataObj.resource.associated_data,global.MCHOBJ.APIv3)
	console.log('\nresultObj===',resultObj,'\n')
	let attach = resultObj.attach.split(',')
	if (dataObj.event_type === 'PAYSCORE.USER_CONFIRM') { // 微信支付分服务订单用户已确认
		if (attach[2] === 'cash') {
			async.waterfall([
		        function(callback){ // 哈哈开门操作
		            request.post({
						url:`http://api.hahabianli.com/door/open`,
						form:{
							access_token: global.tokenObj.access_token,
							device_id: attach[1],
							out_user_id: attach[0],
							open_type:'OUT'
						},
						json:true
					}, (error, response, body)=>{
						if(body.code === 1){
							/*{"code": 1,"info": "success",
								"data": {
							      "activity_id": "1801081740422435",
							      "user_id": "01081609535A532751AB2DB"
							   	}
							}*/
							console.log('哈哈开门成功', JSON.stringify(body.data))
							callback(null,body.data)
						}else{
							callback(new Error("哈哈开门失败==="+body.data.activity_id));
							return
						}
					})
		        },
		        function(hahData,callback){
		            let saveDate = {
			            out_order_no: resultObj.out_order_no,
			            activity_id: hahData.activity_id,
			            user_id: attach[0],
			            haha_user_id: hahData.user_id,
			            device_id: attach[1],
			            create_time: moment(dataObj.create_time).format('YYYY-MM-DD HH:mm:ss') // 创建支付分订单 时间
			        }
			        // if (attach[2] === 'red') {
			        // 	saveDate.buyWay='red'
			        // 	saveDate.red_money=50
			        // }
			        db.insertData('hh_order', saveDate, (err, datas) => {
			            if (err) {
			            	callback(new Error("hh_order微信支付分订单创建失败="+hahData.activity_id));
			                console.log('err====',err)
			                return
			            }
			            callback(null,'创建微信支付分订单 success');
			            res.send({
			            	"code": "SUCCESS",
	    					"message": "成功"
			            })
			        })
		        },
		    ], function(err, results){
		        if (err) {
		           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
		        }else{
		            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
		        }
		    });
		}else{
			let arrObj= await queryRedProduct(attach[1])
			//[]或[ { redPrice: 50 } ]

			let saveDate = {
	            out_order_no: resultObj.out_order_no,
	            user_id: attach[0],
	            device_id: attach[1],
	            buyWay: 'red',
	            red_money: arrObj[0]?.redPrice||0,
	            create_time: moment(dataObj.create_time).format('YYYY-MM-DD HH:mm:ss') // 创建支付分订单 时间
	        }
	        db.insertData('hh_order', saveDate, (err, datas) => {
	            if (err) {
	                console.log(err,'err====',"hh_order 红包 订单创建失败="+ resultObj.out_order_no)
	                return res.send({
		            	"code": "SUCCESS",
						"message": "成功"
		            })
	            }
	            res.send({
	            	"code": "SUCCESS",
					"message": "成功"
	            })
	        })
		}
	    return
	}
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	if (dataObj.event_type === 'PAYSCORE.USER_PAID') {//微信支付分服务订单支付成功
		async.waterfall([
			function(callback){
	            let sql = `select device_id,status from hh_order where out_order_no='${resultObj.out_order_no}' limit 1`;
	            db.selectAll(sql, (err, result) => { // 查询是否存在
	                if (err) {
	                    callback(new Error("system error"));
	                    console.log('查询hh_order失败222222',moment().format('YYYY-MM-DD HH:mm:ss'))
	                }
	                if (result.length!=0 && result[0].status==1) { // 对未支付的订单 更新信息  防止微信重复推送
	                	resultObj.device_id=result[0].device_id
	                    callback(null)
	                }else{
	                    callback(new Error("hh_order 数据更新失败333"));
	                    return res.send({
			            	"code": "SUCCESS",
	    					"message": "成功"
			            })
	                }
	            })
	        },
	        function(callback){
	        	let _where = {out_order_no:resultObj.out_order_no};
		        let _set = {
		            status:2
		        };
		        db.updateData('hh_order',_set,_where,(err,result)=>{
		            if (err) {
		                console.log('hh_order 数据更新失败333',moment().format('YYYY-MM-DD HH:mm:ss'))
		                callback(new Error("hh_order 数据更新失败333"));
		            }
		            callback(null)
		        })
	        },
	        function(callback){
	        	var updateSql = `update hh_merchant set totalMoney=totalMoney+${(resultObj.total_amount)/100} where machine_id='${resultObj.device_id}'`;
	        	// console.log('updateSql==',updateSql)

				db.connection.query(updateSql, (error, results) => {
					if (error) {
						console.log(error)
						callback(new Error("system error"));
						return 
					}
					callback(null,'商户资产更新 successfully');
					res.send({
		            	"code": "SUCCESS",
    					"message": "成功"
		            })
				})
	        },
	    ], function(err, results){
	        if (err) {
	           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }else{
	            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }
	    });
		return
	}
})


// 创建微信支付分订单
router.post('/createWxOrder', (req, res, next) => {
	let out_user_id = req.body.user_id;
    let device_id = req.body.device_id;
    let buyWay = req.body.buyWay;
    if (out_user_id==''||device_id==''||buyWay=='') {
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    async.waterfall([
	    function(callback){ 
	    	let sql = `select user_id from hh_member where user_id='${out_user_id}' limit 1`;
	    	// console.log('sql===',sql)
            db.selectAll(sql, (err, result) => { // 查询是否存在
                if (err) {
                    callback(new Error("system error"));
                    console.log(err,'查询hh_order失败',moment().format('YYYY-MM-DD HH:mm:ss'))
                    return
                }
                if (result.length==0) {
                    callback(new Error("用户不存在2222"));
                    return res.json({
			            code: '401',
			            msg: '用户不存在'
			        })
                }else{
                    callback(null)
                }
            })
	    },
	    function(callback){
            let data={
				"out_order_no": 'NN'+(moment().format('YYMMDDHHmm')).toString() + (Number(Math.random().toString().substr(3, 5)) + Date.now()).toString(),
				"appid":appid,
				"service_id":global.MCHOBJ.service_id,
				"service_introduction":"微厅开门柜",
				"time_range":{
					"start_time":"OnAccept"
				},
				"risk_fund":{
					"name": "CASH_DEPOSIT",
					"amount": 20000
				},
				"attach":`${out_user_id},${device_id},${buyWay}`,
				"notify_url":"https://www.hj19800.com/redapi/v2/wxPayCallBack"
			}
			// console.log(JSON.stringify(data))
			let headers= wxRequestHeader('POST','/v3/payscore/serviceorder',JSON.stringify(data))
			request.post({
				url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder`,
				body:data,
				json:true,
				headers,
			}, (error, response, body)=>{
				// let jsons = body // body是 json
				console.log('\nout_order_no===',  body.out_order_no,verifyWxSign(response, JSON.stringify(body)))
				// console.log('package===',  body.package, '\n')
				// console.log('verifyWxSign(response, body)',verifyWxSign(response, JSON.stringify(body)))
				if (verifyWxSign(response, JSON.stringify(body))) {
					return res.json({  
					    "code": "200",
					    "out_order_no": body.out_order_no,
					    "package": body.package,
					    "msg": "成功"
					})
				}else{
					return res.json({  
					    "code": "200",
					    "message": "成功"
					})
				}
			})
        }
	], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
})



function verifyWxSign(response,body){
	// console.log('response=',response.headers)
	/*let ooo=null
	for(let kkk of Object.getOwnPropertySymbols(response) ){
		if (response[kkk]&&response[kkk].server) {
			ooo=response[kkk]
			break
		}
	}*/
	// let signature =ooo['wechatpay-signature']
	let signature =response.headers['wechatpay-signature']
	let str=`${response.headers['wechatpay-timestamp']}\n${response.headers['wechatpay-nonce']}\n${body}\n`
	return sha256SignVerify(str,signature)
}

// 调用 微信证书接口  测试
router.get('/testWxCertificates', (req, res, next) => {
	let headers= wxRequestHeader('GET','/v3/certificates')
	request.get({
		url:`https://api.mch.weixin.qq.com/v3/certificates`,
		headers,
	}, (error, response, body)=>{
		let jsons = JSON.parse(body) // body是string类型
		console.log(verifyWxSign(response, body))
		return res.json({
		        code: '200',
		        data:jsons,
		        msg: 'ok'
		    })
	})
})















module.exports = router;
