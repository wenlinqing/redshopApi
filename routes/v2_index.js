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
var schedule = require('node-schedule');

// 开门柜小程序
const appid='wx4a00d1947cb7b08a'
const secret='a78f7cf4de71500e2e9901b45f4b5fcf'

// 哈哈便利提供给商户
const app_id='2206102201460062'
const app_secret='1802802ff6aaf3ed9f611d1dcdaa8cef'


// access_token: '16edf695b24ce679f8477d1c227503caa4bca993',
//   ticket: '5f0f442c8c63cee7dfd2f23da60e7baa',
//   exprire: 1659247301


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

function signMd5(obj){
	let newObj= JSON.parse(JSON.stringify(obj))
	delete newObj.sign
	let newBBB=objKeySort(newObj)
	let connects = '';
	for (let k in newBBB) {
	    connects += k+'='+ encodeURIComponent(newBBB[k])+'&';
	}
	connects=connects.substring(0,connects.length-1)+global.tokenObj.ticket
	return md5(connects)
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

// 用户开门操作
router.post('/openDeviceDoor', (req, res, next) => {
    let out_user_id = req.body.user_id||'';
    let device_id = req.body.device_id||'';
    if (out_user_id==''||device_id=='') {
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
    // console.log('aaaaaaaaa')
	request.post({
		url:`http://api.hahabianli.com/door/open`,
		form:{
			access_token:global.tokenObj.access_token,
			device_id,
			out_user_id,
			open_type:'OUT'
		}
	}, (error, response, body)=>{
		let jsons = JSON.parse(body) // body是string类型
		if(jsons.code === 1){
			/*{
			   "code": 1,
			   "info": "success",
			   "data": {
			      "activity_id": "1801081740422435",
			      "user_id": "01081609535A532751AB2DB"
			   }
			}*/
			return res.json({
		        code: '200',
		        // data:jsons.data,
		        msg: 'ok'
		    })
		}else{
			return res.json({
				code,
				msg: jsons.info //{ code: 4000, info: '[ 用户编号 ] 参数格式不对!' }
			})
		}
	})
})

// 设备和锁的状态查询 
router.post('/checkDiviceStatus', (req, res, next) => {
    let device_id = req.body.device_id||'';
    if (device_id=='') {
        return res.json({
            code: '444',
            msg: '参数错误'
        })
    }
	request.post({
		url:`http://api.hahabianli.com/device/checkstatus`,
		form:{
			access_token:global.tokenObj.access_token,
			device_id
		}
	}, (error, response, body)=>{
		let jsons = JSON.parse(body) // body是string类型
		// console.log('jsons===dddd', jsons)
		if(jsons.code === 1){
			return res.json({
		        code: '200',
		        data:jsons.data,
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
			return res.json({
				code,
				msg: jsons.info
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
	request.post({
		url:`http://api.hahabianli.com/device/getDeviceOnlineStatus`,
		form:{
			access_token:global.tokenObj.access_token,
			device_id
		}
	}, (error, response, body)=>{
		let jsons = JSON.parse(body) // body是string类型
		if(jsons.code === 1){
			return res.json({
		        code: '200',
		        data:jsons.data,
		        msg: 'ok'
		    })
		}else{
			return res.json({
				code: 2002,
				msg: 'access_token已过期'
			})
		}
	})
})

// 哈哈零售开门回调通知接口
router.post('/hahaDeviceCallBack', (req, res, next) => {
	let data=req.body
	let {sign} = data.sign
	console.log(sign === signMd5(data),'====sign',moment().format('YYYY-MM-DD HH:mm:ss'))
	// if (sign === signMd5(data)) {
		console.log('haha Device CallBack',data)
		res.send('success')

		if (data.status === 'CLOSED') {
			async.waterfall([
		        function(callback){
		            let sql = `select activity_id from hh_order where activity_id=${data.activity_id} limit 1`;
		            db.selectAll(sql, (err, result) => { // 查询是否存在
		                if (err) {
		                    callback(new Error("system error"));
		                    console.log('查询hh_order失败',moment().format('YYYY-MM-DD HH:mm:ss'))
		                }
		                if (result.length==0) {
		                    callback(null, '')
		                }else{
		                    callback(null, result[0].activity_id)
		                }
		            })
		        },
		        function(activity_id, callback){
		        	console.log('result[0].activity_id==', activity_id,moment().format('YYYY-MM-DD HH:mm:ss'))
		        	if (activity_id == '') {
		        		let saveDate = {
				            activity_id: data.activity_id,
				            user_id: data.out_user_id,// 自己系统的用户id
				            haha_user_id: data.user_id,// 哈哈系统的用户id
				            device_id:data.device_id,
				            create_time: moment(Number(data.create_time)*1000).format('YYYY-MM-DD HH:mm:ss')
				        }
				        db.insertData('hh_order', saveDate, (err, data) => {
				            if (err) {
				            	callback(new Error("hh_order订单创建失败="+data.activity_id));
				                console.log('hh_order订单创建失败',data.activity_id,moment().format('YYYY-MM-DD HH:mm:ss'))
				            }
				            callback(null);
				        })
		        	}else{
			            let _where = {activity_id: activity_id};
			            let _set = {
			                user_id: data.out_user_id,// 自己系统的用户id
				            haha_user_id: data.user_id,// 哈哈系统的用户id
				            device_id:data.device_id,
				            create_time: moment(Number(data.create_time)*1000).format('YYYY-MM-DD HH:mm:ss')
			            };
			            db.updateData('hh_order',_set,_where,(err,result)=>{
			                if (err) {
			                	callback(new Error("hh_order 红包转账后 订单创建失败="+data.activity_id));
			                    console.log('hh_order 红包转账后 订单创建失败',moment().format('YYYY-MM-DD HH:mm:ss'))
			                }
			                callback(null, '红包转账后 订单创建成功');
			            })
		        	}
		        }
	        ], function(err, results){
		        if (err) {
		           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
		        }else{
		            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
		        }
		    });
		}
	// }

})

// 哈哈零售订单回调接口
router.post('/hahaOrderCallBack', (req, res, next) => {
	let data=req.body
	let {sign} = data.sign
	// if (sign === signMd5(data)) {
		console.log('haha Order CallBack',data)
		res.send('success')

		async.waterfall([
	        // function(callback){
	            /*let sql = `select activity_id,red_money from hh_order where activity_id=${data.activity_id} and status=1 limit 1`;
	            db.selectAll(sql, (err, result) => { // 查询是否存在
	                if (err) {
	                    callback(new Error("system error"));
	                    return res.json({
	                        code: '500',
	                        msg: '系统错误'
	                    })
	                }
	                if (result.length==1) {
	                    callback(null,result[0])
	                }else{
	                    callback(new Error("查询hh_order订单失败="+data.activity_id));
	                }
	            })*/
	        // },
	        function(callback){
	            let _where = {activity_id:data.activity_id};
		        let _set = {
		            order_id:data.order_id,
		            order_name:data.order_name,
		            order_money:data.order_money
		        };
		        db.updateData('hh_order',_set,_where,(err,result)=>{
		            if (err) {
		                console.log('hh_order 数据更新失败222',moment().format('YYYY-MM-DD HH:mm:ss'))
		                callback(new Error("hh_order 数据更新失败222"));
		            }
		            callback(null)
		        })
	        },
	        function(callback){
	        	let valAry = []
	            JSON.parse(data.order_goods).forEach((item,index)=>{
    				valAry.push([ data.order_id, item['code'], item['product_name'], item['product_num'], item['price'] ])
				})

	            let sql = 'INSERT INTO hh_order_detail(order_id, code, product_name, product_num, price) VALUES ?'; //批量插入数据

	            db.connection.query(sql, [valAry], function (err3, rows, fields) {
	                if (err3) {
	                    callback(new Error("system error2"));
	                }else{
	                	callback(null,`订单创建成功 ${data.order_id}`);
	                }
	            });
	        }
	    ], function(err, results){
	        if (err) {
	           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }else{
	            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }
	    });
	// }
	
})





























module.exports = router;
