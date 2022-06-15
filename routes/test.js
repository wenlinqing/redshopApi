
// var moment = require('moment');
// console.log(moment('2021-11-05 11:10:36').valueOf())

// let end = 1636081836000+1000*100
// console.log(end,moment(end).format('YYYY-MM-DD HH:mm:ss'))



// console.log(moment(1636015632000).format('YYYY-MM-DD HH:mm:ss'))

// 1636081836
// 1636015632



// 1636015632 1636082537
// let t='0.5'


// let lt = 1636095280

// let st = 1636095261 

// let et = 1636095361

// // console.log( lt >= st && lt<= et )

// console.log( parseFloat('123')==parseFloat('123.01') )

// let out = 200
// let timeout = out?(out>600?600:out):100;


const md5 = require('js-md5')

//json数据排序
function objKeySort(obj, typesort = 'sort') { //排序的函数
    if (typesort == 'sort') {
        var newkey = Object.keys(obj).sort(); //升序
    } else {
        var newkey = Object.keys(obj).sort().reverse(); //降序
    }
    //先用Object内置类的keys方法获取要排序对象的属性名，再利用Array原型上的sort方法对获取的属性名进行排序，newkey是一个数组
    var newObj = {}; //创建一个新的对象，用于存放排好序的键值对
    /*for (var i = 0; i < newkey.length; i++) { //遍历newkey数组
        newObj[newkey[i]] = obj[newkey[i]]; //向新创建的对象中按照排好的顺序依次增加键值对
    }*/
    for(let k of newkey){
        newObj[k] = obj[k]
    }
    return newObj; //返回排好序的新对象
}

let data = {
    'r':'19.00',
    'm':'13051393188',
    'p':'12312323213312123',
    'e':'Iyh8912938h9sadbhjasdjadhuad'
}

var secret = '12345';
var newObj = objKeySort(data);

let connects = '';
for (let item in newObj) {
    connects += item+'='+ newObj[item]+'&';
}
connects += "secret="+secret;
console.log('拼接格式后', connects);
// 拼接格式后 e=Iyh8912938h9sadbhjasdjadhuad&m=13051393188&p=12312323213312123&r=19.00&secret=12345

let sign = md5(connects);
data['s']=sign.toUpperCase()
console.log(encodeURIComponent(JSON.stringify(data)))
// 68837268e6ebc9aabdf1fc168a6cf66b



// e=Iyh8912938h9sadbhjasdjadhuad&m=13051393188&p=12312323213312123&r=19.00&secret=12345





// 68837268E6EBC9AABDF1FC168A6CF66B



// 原始参数：%7B%22r%22%3A%2219.00%22%2C%22m%22%3A%2213051393189%22%2C%22p%22%3A%2212312323213312123%22%2C%22e%22%3A%22Iyh8912938h9sadbhjasdjadhuad%22%2C%22s%22%3A%22055F220E0429CC5B361CD3AFD8093908%22%7D
// '{"r":"19.00","m":"13051393189","p":"12312323213312123","e":"Iyh8912938h9sadbhjasdjadhuad","s":"055F220E0429CC5B361CD3AFD8093908"}'

// {"r":"19.00","m":"13051393189","p":"12312323213312123","e":"Iyh8912938h9sadbhjasdjadhuad","s":"055F220E0429CC5B361CD3AFD8093908"}





// console.log(timeout,timeout/5)

/*
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

// const sleep = require('system-sleep');


function aaa() {
	async.waterfall([
		async function(callback){
			console.log('111111111')
			// callback()
		},
		async function(callback){
			console.log('222')
			// callback(null,'aaaaa')
			// callback(null,'ddd')
		},
		async function(callback){
			console.log( '33333')
			// callback(null,null)
			// callback()
		},
    ], function(err, results){
    	console.log(err,results)
        if (err) {
           console.log('err err err',err);
        }else{
            console.log('results',results);
        }
    });
}

aaa()

*/





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



/*



async function getDetailList(){ // 调出货接口
	let detailList = await getDBList('No220106164144539266')
	console.log('detailList.length===',detailList)
	for (let j = 0; j < detailList.length; j++) {
		let item=detailList[j]
        for (let i = 0; i < item.num; i++) {
			let huodaoList = await getHuoDaoList('5821110050');
			let huodaoObj={}
		    for (let i = 0; i < huodaoList.length; i++) {
		    	if (huodaoList[i].mcdcode==item.product_id && huodaoList[i].stocknum>0 ) {
		    		console.log(huodaoList[i].mcdcode, '的当前货道',huodaoList[i].pacode,'总库存', huodaoList[i].stocknum)
		            huodaoObj['pacode']=huodaoList[i].pacode
		            huodaoObj={...huodaoObj,...item}
		            // console.log('===========',huodaoObj)
		    		break
		    	}
		    }
			
			console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
            let outresult = await outProduct('15602606622','5821110050' ,huodaoObj)
            console.log('等待商品出库')
            sleep(23000)
		}
	}
	
}

*/
// getDetailList()

/*function outPro(){
	let huodaoObj={
		id: 13,
		order_id: 'No211208163897721151',
		product_id: '30010',
		product_name: '富舟锌硒钙大米',
		product_img: '5a39635171d5675d4eaca5fbb5423a9b.jpg',
		price: 5000,
		num: 1,
		pacode: '261'
	}
	let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
	let sign = md5('account=15602606622&appid='+config.appid+'&busino='+huodaoObj.order_id+'&money='+huodaoObj.price+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid=5821110050&secret='+config.secret).toUpperCase()

	let url ='http://soft.kivend.net/krcs/busin_thirdsell?account=15602606622&appid='+config.appid+'&busino='+huodaoObj.order_id+'&money='+huodaoObj.price+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid=5821110050&sign='+sign
	request(url, (error, response, body)=>{
		console.log(body)
	})
}*/

// outPro()

// sleep(2000)

// console.log(Math.random().toString().slice(2,8))
// for (let i = 0; i < 3; i++) {
// 	sleep(2000)

// 	console.log('jjjjjjjjjj')

// }


// async function helloFun(){
	// return 'hello world'
	// throw 'error'
// }

// helloFun().then(res=>{
// 	console.log(res)
// }).catch(err=>{
// 	console.log(err)
// })
// console.log('eeeee')
/*
function getDBList(orderNo) {
	console.log('orderNo=',orderNo)
	return new Promise((resolve,reject)=>{
		let sql22=`select * from order_detail where order_id='${orderNo}'`  //  No211208163897721151
	    db.connection.query(sql22, function (err,results) {
	        if (err) {
	            // console.log('err======',err)
	        }
	        let string = JSON.stringify(results);
            let data = JSON.parse(string);
	        resolve(data)
	    })
    })
}

function getHuoDaoList(vmid){
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
    // console.log('huodaoObj===',huodaoObj, vmid)
    return new Promise((resolve,reject)=>{
        let id = huodaoObj.order_id.slice(0,13)+(Math.random().toString().slice(2,8))
        let timestamp = moment().add(-2, 'minutes').format('YYYYMMDDHHmmss')
        let sign = md5('account='+account+'&appid='+config.appid+'&busino='+ id +'&money='+huodaoObj.price+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid='+vmid+'&secret='+config.secret).toUpperCase()
        let url ='http://soft.kivend.net/krcs/busin_thirdsell?account='+account+'&appid='+config.appid+'&busino='+id+'&money='+huodaoObj.price+'&pacode='+huodaoObj.pacode+'&timestamp='+timestamp+'&vmid='+vmid+'&sign='+sign
        console.log("url=====",url)
        return
        request(url, (error, response, body)=>{
            let res = JSON.parse(body)
            console.log('出货接口结果：',res)
            if (res.ret==0) {
                resolve(res)
            }else{
                reject(res)
            }
        })
    })
}
*/


/*async function getFun(){
	let huodaoList = await getHuoDaoList();
	let huodaoObj={}
    for (let i = 0; i < huodaoList.length; i++) {
    	if (huodaoList[i].mcdcode=='30010' && huodaoList[i].stocknum>0 ) {
            huodaoObj['pacode']=huodaoList[i].pacode
            // huodaoObj=item
    		break
    	}
    }
	console.log(huodaoList.length,huodaoObj)
	let outresult = await outProduct(huodaoObj)
}*/

// getFun()
// console.log('end end end')
/*
function ajaxFun(){
    return new Promise((resolve,reject)=>{
        setTimeout(()=>{
        	let dd = Math.random()
        	if (dd<0.5) {
        		resolve('ajax data')
        	}else{
        		reject('error')
        	}
            
        },10000)
    })
}

async function staring(){
    console.time('出货时间')
    console.log('staring')
    try{
    	let list = await ajaxFun()
    	console.log('list===',result)
    } catch(err){
    	console.log('list  err====',err)
    }
    console.log('开始')
//     for(let o of dataObj){
    for(let i=0;i<1;i++){
        console.log('iiiii=',i)
        for(let j=0; j<3;j++){
            console.log('jjj=',j)
            try{
            	let result = await ajaxFun()
            	console.log('result===',result)
            } catch(err){
            	console.log('err====',err)
            	continue
            }
            // console.log('sleep start')
            // sleep(23000)
            // console.log('sleep end')
        }
    }
    console.log('结束')
    console.timeEnd('出货时间')
}
// staring()

// console.log('end end end')
*/












