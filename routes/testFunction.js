const express = require('express');
const router = express.Router();
const moment = require('moment');
const async = require('async');
const request = require('request')
const md5 = require('js-md5')
const db = require('../mysql/mysql.js');

const urlencode = require('urlencode');

const {sha256SignVerify,decryptoFun, wxRequestHeader} = require('./sha256Sign.js')

global.tokenObj={
    "access_token": "16edf695b24ce679f8477d1c227503caa4bca993",
    "exprire": 1659247301,
    "ticket": "5f0f442c8c63cee7dfd2f23da60e7baa"
}

// global.appid=''
// global.appid=''
// global.appid=''
global.MCHOBJ={
    mchid: '1626826768',
    serial_no: '29C857748C843AE2CEF2F4BD1C54195042908695',
    service_id: '00004000000000165709643597727438',
    APIv2: 'C8FtQyLF35dYu6XFajbISvR82p4DPWwP',
    APIv3: 'vODZxv72pSR3RGslTJkKkmFdJgjqtagz'
}
// 开门柜小程序
const appid='wx4a00d1947cb7b08a'

function verifyWxSign(res,body){
	let ooo=null
	for(let kkk of Object.getOwnPropertySymbols(res) ){
		if (res[kkk]&&res[kkk].server) {
			ooo=res[kkk]
			break
		}
	}
	let signature =ooo['wechatpay-signature']
	// console.log('ooo===',ooo)
	let str=`${ooo['wechatpay-timestamp']}\n${ooo['wechatpay-nonce']}\n${body}\n`
	return sha256SignVerify(str,signature)
}



function wxPayCallBack(){
	let dataObj={
	  id: '4ce17aa0-4118-592a-8828-512a02f06570',
	  create_time: '2022-07-27T23:06:26+08:00',
	  resource_type: 'encrypt-resource',
	  event_type: 'PAYSCORE.USER_CONFIRM',
	  summary: '微信支付分服务订单用户已确认',
	  resource: {
	    original_type: 'payscore',
	    algorithm: 'AEAD_AES_256_GCM',
	    ciphertext: 'O+QeyeSTerSmQLNJcdrCJ14Pu61L/RdJF3oyzGcEZ3vw2cYHfDINpCAPVxe5livy9/9xDRrGxx/Q+mc0Iu6XLRH1MFoK6Y6KUvPQ+PRI414+LK9S9ErvtsHczJ0oZqb0T+KEieFjbD3SqacTQyGnAv1pAofGz3fD3hwoSaeqYu/PkAGix0noXTHIhQTDK3fMaleuMhX8SpzTvKxObPXR0xQ7iLOo/tXbWr+M6DNhvdy0JNZwxOXHzm/z0xC6v7ahm1+rmfpyGmvEBh7WdvtuY8gRhrcXuRKmUChZZ5msTm5TzjbVNQOz5RpVfGoRDS2Tx4gkJ66B4LNYSpzHdeW38Cqcg6mMjKYCKO9O3zhqphJqp5w3byJTv0m5T6uATMIDdIz8JkIZbOAeSE44pjSYiw3GYPH/vvmZQrzWv/kqNsriLY3BNGvpj5FshQuOydPQx2eOOH+jWWC1kahoXi0o7xKSqRJfDcufEQqllDhK8twoAS/LGpIJBxktMBnB2d3xACDkfNwpLnO+nsYiXOCFv7iGgLywfS+jS0aSA4qI9nx/n7+4EVSRgwsRXPNZSI3dS1W5xemw6DI6WpNm5EtKEkmItZty3C5o2T0FjmjDpyi9GN8smtVuk+he844GhILzn52B4oymbVU8RwomFyDeRzNTy/ZcjN2XUjSiDdh4jm+8VdDutfWx07wibhaCFMdPScTJfIYSRmdt2ugFXBVCqu7wVO/Zg+NU14hEZN6dyp+OOW1QAp0ip6gMduasAiJ0+MwXnhCo888aEqcjhQMHI1nOTc3979+c',
	    associated_data: 'payscore',
	    nonce: 'iUQD2k9ZHCfb'
	  }
	}
	// console.log('wxPayCallBack', data)
	let resultObj = decryptoFun(dataObj.resource.ciphertext,dataObj.resource.nonce,dataObj.resource.associated_data,'vODZxv72pSR3RGslTJkKkmFdJgjqtagz')
	let attach = resultObj.attach.split(',')
	if (dataObj.event_type === 'PAYSCORE.USER_CONFIRM' && attach[2] ==='cash') { // 微信支付分服务订单用户已确认
		async.waterfall([
	        function(callback){ // 哈哈开门操作
	            request.post({
					url:`http://api.hahabianli.com/door/open`,
					form:{
						// access_token: global.tokenObj.access_token,
						access_token: '16edf695b24ce679f8477d1c227503caa4bca993',
						device_id: attach[1],
						out_user_id: attach[0],
						open_type:'OUT'
					},
					json:true
				}, (error, response, body)=>{
					if(body.code === 1){
						/*{
						   "code": 1,
						   "info": "success",
						   "data": {
						      "activity_id": "1801081740422435",
						      "user_id": "01081609535A532751AB2DB"
						   }
						}*/
						console.log('哈哈开门成功', body.data)
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
		        db.insertData('hh_order', saveDate, (err, datas) => {
		            if (err) {
		            	callback(new Error("hh_order微信支付分订单创建失败="+hahData.activity_id));
		                console.log('err====',err)
		                return
		            }
		            callback(null,'创建微信支付分订单 success');
		        })
	        },
	    ], function(err, results){
	        if (err) {
	           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }else{
	            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }
	    });
	}
	
}




// wxPayCallBack()


function cancelOrder(){
	let data={
		"appid":appid,
		"service_id":global.MCHOBJ.service_id,
		"reason":"无效订单"
	}
	// console.log(JSON.stringify(data))
	let headers= wxRequestHeader('POST',`/v3/payscore/serviceorder/NN22073017521659174827101/cancel`,JSON.stringify(data))
	request.post({
		url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder/NN22073017521659174827101/cancel`,
		body:data,
		json:true,
		headers,
	}, (error, response, body)=>{
		// let jsons = body // body是 jsons
		// console.log('jsons===',  body)
		// console.log('verifyWxSign(response, body)',verifyWxSign(response, JSON.stringify(body)))
			console.log('订单已失效==',verifyWxSign(response, JSON.stringify(body)), moment().format('YYYY-MM-DD HH:mm:ss'))
		
		/*if (body?.out_order_no) {
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
		}*/
	})
}

// cancelOrder()



function completeOrder(){
	/*let data={
		"appid":appid,
		"service_id":global.MCHOBJ.service_id,
		"time_range":{
			"end_time":moment().format('YYYYMMDDHHmmss') 
			// 创建订单未填写服务结束时间，则完结的时候，服务结束时间必填
		},
		"post_payments":[
			{
				"name":"纸巾x1",
				"amount":1
			}
		],
		"total_amount":1
	}
	// console.log(JSON.stringify(data))
	let headers= wxRequestHeader('POST',`/v3/payscore/serviceorder/NN22072923261659108431953/complete`,JSON.stringify(data))
	request.post({
		url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder/NN22072923261659108431953/complete`,
		body:data,
		json:true,
		headers,
	}, (error, response, body)=>{
		let jsons = body // body是 json
		console.log('jsons===',  body)
		console.log('verifyWxSign(response, body)',verifyWxSign(response, JSON.stringify(body)))
		
	})*/
	let data={
		activity_id: '2207301121249331',
		order_goods: '[{"id":"288","code":"mengniuyouyi","bar_code":"6934665087653","product_name":"蒙牛优益C活菌型乳酸菌原味340ml","pic":"\\/img\\/201810\\/19\\/5bc9aee04a09d40022.png","product_num":1,"money":"6.50","origin_price":0.1,"price":6.5}]',
		order_money: '0.01',
	}
	async.waterfall([
		function(callback){
        	console.log('此处调结算  完结支付分订单接口')
        	// 先查询订单类型
        	let sql = `select out_order_no,buyWay from hh_order where activity_id='${data.activity_id}' limit 1`;
            db.selectAll(sql, (err, result) => { // 查询是否存在
                if (err) {
                    callback(new Error("system error"));
                    console.log('查询hh_order失败4',moment().format('YYYY-MM-DD HH:mm:ss'))
                    return
                }
                if (result.length!=0) {
                    callback(null, result[0])
                }else{
                    callback(new Error("查询hh_order失败5"));
                }
            })
        },
        function(subObj, callback){
        	let total_amount = data.order_money*100
        	if (subObj.buyWay == 'red') {
        		total_amount -= 50*0.2 // 每包大米 50红包=10元
        	}
        	let post_payments=JSON.parse(data.order_goods).map(item=>{
        		return {
        			"name": item.product_name,
        			"amount": item.product_num,
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
				"post_payments":post_payments,
				"total_amount":1
			}
			// console.log(JSON.stringify(data))
			let headers= wxRequestHeader('POST',`/v3/payscore/serviceorder/${subObj.out_order_no}/complete`,JSON.stringify(budyData))
			request.post({
				url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder/${subObj.out_order_no}/complete`,
				body:budyData,
				json:true,
				headers,
			}, (error, response, body)=>{
				// console.log('jsons===',  body)
				console.log('支付完成 verifyWxSign(response, body)',verifyWxSign(response, JSON.stringify(body)))
			})
        },
	], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
}

// completeOrder()



function hahaOrderCallBack(){
	let data={
	  activity_id: '2207272355061360',
	  create_time: '1658234538',
	  device_id: 'B30874',
	  from: 'API',
	  order_detail: '{"mengniuyouyi":-1}',
	  order_goods: '[{"id":"288","code":"mengniuyouyi","bar_code":"6934665087653","product_name":"蒙牛优益C活菌型乳酸菌原味340ml","pic":"\\/img\\/201810\\/19\\/5bc9aee04a09d40022.png","product_num":1,"money":"6.50","origin_price":0.1,"price":6.5}]',
	  order_id: '2207192042186162',
	  order_money: '6.50',
	  order_name: '蒙牛优益C活菌型乳酸菌原味340ml x 1',
	  user_id: '2207171605474781',
	  sign: 'd86d0f3590020490f83f40d6152ccfb3'
	}

	async.waterfall([
        function(callback){
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
                	callback(null,`订单详情创建成功 ${data.order_id}`);
                }
            });
        },
        function(text,callback){
        	console.log('此处调结算  完结支付分订单接口',text)
        	callback(null,text)
        	// completeOrder()
        }
    ], function(err, results){
        if (err) {
           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
        }else{
            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    });
}

// hahaOrderCallBack()


function updateMechant(){
	let resultObj={
		out_order_no: 'NN22073009201659144126806',
		total_amount: 1,
	}
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
	         //            return res.send({
			       //      	"code": "SUCCESS",
	    					// "message": "成功"
			       //      })
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
	        	console.log('updateSql==',updateSql)

				db.connection.query(updateSql, (error, results) => {
					if (error) {
						console.log(error)
						callback(new Error("system error"));
						return 
					}
					callback(null,'商户资产更新 successfully');
					// res.send({
		   //          	"code": "SUCCESS",
    	// 				"message": "成功"
		   //          })
				})
	        },
	    ], function(err, results){
	        if (err) {
	           console.log('err err err',err,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }else{
	            console.log('results',results,moment().format('YYYY-MM-DD HH:mm:ss'));
	        }
	    });
}

// updateMechant()


function payFun(){
	let budyData={
		"appid":appid,
		"service_id":global.MCHOBJ.service_id,
		"time_range":{
			"end_time":moment().format('YYYYMMDDHHmmss') 
			// 创建订单未填写服务结束时间，则完结的时候，服务结束时间必填
		},
		"post_payments":[{"name":"椰树牌椰汁听装310ml","amount":550}],
		"total_amount":550
	}
	// console.log(JSON.stringify(data))
	let headers= wxRequestHeader('POST',`/v3/payscore/serviceorder/NN22073012081659154145827/complete`,JSON.stringify(budyData))
	request.post({
		url:`https://api.mch.weixin.qq.com/v3/payscore/serviceorder/NN22073012081659154145827/complete`,
		body:budyData,
		json:true,
		headers,
	}, (error, response, body)=>{
		if (body.state === 'DOING') {
			console.log('支付完成 verifyWxSign(response, body)', body)
		}else{
			console.log('NN22073012081659154145827','支付错误信息=',body, moment().format('YYYY-MM-DD HH:mm:ss'))
			// 支付错误信息= { code: 'PARAM_ERROR', message: '最终总金额计算非法' } 
		}
	})
}

// payFun()


function queryRedProduct(){ // 本系统  查询设备添加的 红包兑换 商品价格
	return new Promise((resolve,reject)=>{
		let sql = `select redPrice from hh_product where device_id='B308741' limit 1`;
	    db.selectAll(sql, (err, result) => { // 查询是否存在
	        if (err) {
	            console.log('查询hh_product失败',moment().format('YYYY-MM-DD HH:mm:ss'))
	            reject(err)
	        }
	        resolve(result)
	    })
	})
}


async function testFFF(){
	console.log('111111')
	let res= await queryRedProduct()
	console.log('22222')
	console.log('res',res)
	console.log('3333',res[0]?.redPrice||0)

}

// testFFF()







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
	    connects += k+'='+ encodeURIComponent(newBBB[k])+'&';// encodeURIComponent   urlencode
	}
	connects=connects.substring(0,connects.length-1)+'5f0f442c8c63cee7dfd2f23da60e7baa'
	console.log('connects=', connects)
	return md5(connects)
}


let cont='activity_id=2207301053119347&create_time=1659149638&device_id=B30874&from=API&order_detail=%7B%22yezhiguan310%22%3A-1%7D&order_goods=%5B%7B%22id%22%3A%225243%22%2C%22code%22%3A%22yezhiguan310%22%2C%22bar_code%22%3A%226957735788847%20%22%2C%22product_name%22%3A%22%E6%A4%B0%E6%A0%91%E7%89%8C%E6%A4%B0%E6%B1%81%E5%90%AC%E8%A3%85310ml%22%2C%22pic%22%3A%22%5C%2Fimg%5C%2F201909%5C%2F26%5C%2F5d8c4b582f48337316.png%22%2C%22product_num%22%3A1%2C%22money%22%3A%225.50%22%2C%22origin_price%22%3A0%2C%22price%22%3A5.5%7D%5D&order_id=2207301053589888&order_money=5.50&order_name=%E6%A4%B0%E6%A0%91%E7%89%8C%E6%A4%B0%E6%B1%81%E5%90%AC%E8%A3%85310ml%20x%201&user_id=22071716054747815f0f442c8c63cee7dfd2f23da60e7baa'

let cont2='activity_id=2207301053119347&create_time=1659149638&device_id=B30874&from=API&order_detail=%7B%22yezhiguan310%22%3A-1%7D&order_goods=%5B%7B%22id%22%3A%225243%22%2C%22code%22%3A%22yezhiguan310%22%2C%22bar_code%22%3A%226957735788847%20%22%2C%22product_name%22%3A%22%E6%A4%B0%E6%A0%91%E7%89%8C%E6%A4%B0%E6%B1%81%E5%90%AC%E8%A3%85310ml%22%2C%22pic%22%3A%22%5C%2Fimg%5C%2F201909%5C%2F26%5C%2F5d8c4b582f48337316.png%22%2C%22product_num%22%3A1%2C%22money%22%3A%225.50%22%2C%22origin_price%22%3A0%2C%22price%22%3A5.5%7D%5D&order_id=2207301053589888&order_money=5.50&order_name=%E6%A4%B0%E6%A0%91%E7%89%8C%E6%A4%B0%E6%B1%81%E5%90%AC%E8%A3%85310ml%20x%201&user_id=22071716054747815f0f442c8c63cee7dfd2f23da60e7baa'




let oooo={
	// activity_id: '2207300921002294',
	// create_time: '1659144236',
	// device_id: 'B30874',
	// nobuy: '1',
	// notify_type: 'ORC_RESULT',
	// out_user_id: 'VV22071600311659524524053',
	// resource_info: '{"device_type":1,"video_url":"http:\\/\\/img.hahabianli.com\\/buyvideo\\/20220730\\/092100_2207300921002294_0.mp4"}',
	// result: '{"type":"OUT","data":[],"excepts":[]}',
	// source: 'haha',
	// user_id: '2207160033320086',
	// sign: '6be88523115f99e30c8699c200619796'

	// activity_id: '2207301053119347',
	// create_time: '1659149638',
	// device_id: 'B30874',
	// from: 'API',
	// order_detail: '{"yezhiguan310":-1}',
	// order_goods: '[{"id":"5243","code":"yezhiguan310","bar_code":"6957735788847 ","product_name":"椰树牌椰汁听装310ml","pic":"\\/img\\/201909\\/26\\/5d8c4b582f48337316.png","product_num":1,"money":"5.50","origin_price":0,"price":5.5}]',
	// order_id: '2207301053589888',
	// order_money: '5.50',
	// order_name: '椰树牌椰汁听装310ml x 1',
	// user_id: '2207171605474781',
	// sign: '0f5a482d96a4116cc106353525368f6e'


	activity_id: '2207301757182902',
	create_time: '1659175560',
	device_id: 'B30874',
	from: 'API',
	order_detail: '{"hjdywcdm500g":-1}',
	order_goods: '[{"id":"26019","code":"hjdywcdm500g","bar_code":"6949368300237","product_name":"韩家大院五常大米500g","pic":"\\/img\\/202207\\/28\\/62e2489ce82f135458.jpg","product_num":1,"money":"10.00","origin_price":0.01,"price":10}]',
	order_id: '2207301806008322',
	order_money: '10.00',
	order_name: '韩家大院五常大米500g x 1',
	user_id: '2207171605474781',
	sign: 'c97178b4eb3eda544a90764f49eebe1e'

}


let {sign} = oooo
console.log(signMd5(oooo),'====sign')
// console.log( signMd5(cont))











