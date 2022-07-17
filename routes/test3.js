// var CronJob = require('cron').CronJob;

// // console.log('CronJob',CronJob)
// new CronJob('* * * * * *', function() {
//   console.log('You will see this message every second');
// }, function(){
// 	console.log('end end')
// }, true);

//将毫秒去掉精确到秒的时间戳
// newtimestamp = Date.parse(new Date(newtimestamp))
const moment = require('moment');
// var schedule = require('node-schedule');

// const tokenObj={
// 	access_token: "access_token",
// 	exprire: Date.parse(new Date())/1000,
// 	ticket: "ticket"
// }
// // console.log('token时间:',new Date(tokenObj.exprire*1000),Date.parse(new Date()))
// function secondFun(){
// 	var executeTime = new Date(tokenObj.exprire*1000);
// 	console.log('当前时间:',new Date())
// 	executeTime.setMinutes(executeTime.getMinutes()+1, executeTime.getSeconds(), 0) // 加 一分钟
// 	console.log(executeTime,'executeTime')
// 	console.log(tokenObj)
// 	schedule.scheduleJob(executeTime, function(){
// 	 	tokenObj.access_token=Math.random()+'access_token'
// 	 	tokenObj.exprire=Date.parse(new Date())/1000
// 	 	tokenObj.ticket=Math.random()+'ticket'
// 	 	setTimeout(function(){
// 	 		console.log('tokenObj.access_token',tokenObj.access_token)
// 	 	},300)
// 	 	secondFun()
// 	});
// }
	
// secondFun()

// var jsons={
// 	data:{
// 	  access_token: '16edf695b24ce679f8477d1c227503caa4bca993',
// 	  ticket: '5f0f442c8c63cee7dfd2f23da60e7baa',
// 	  exprire: 1659247301
// 	}

// }

// tokenObj.access_token=jsons.data.access_token
// tokenObj.ticket=jsons.data.ticket
// tokenObj.exprire=jsons.data.exprire
// console.log(tokenObj)

// setTimeout(function(){
// 	 		console.log('tokenObj.access_token',tokenObj.access_token)
// 	 	},3000)
// var rule = new schedule.RecurrenceRule();
// var times = [];
// for(var i=0; i<60; i++){
// 	times.push(i);
// }
// rule.second = times;

// var j = schedule.scheduleJob(rule, function(){
// 	now=new Date()
//  	console.log(now, '现在时间：', new Date());
// });

// let dd='1658023905'
// console.log(Date.parse(new Date()), moment().format('YYYY-MM-DD HH:mm:ss'))
// console.log( moment(Number(dd)*1000).format('YYYY-MM-DD HH:mm:ss'))


console.log('VV22071600311659524524053'.slice(0,2))







