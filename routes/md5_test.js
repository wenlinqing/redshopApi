
const md5 = require('js-md5')
const tokenObj={
	"access_token": "16edf695b24ce679f8477d1c227503caa4bca993",
	"exprire": 1659247301,
	"ticket": "5f0f442c8c63cee7dfd2f23da60e7baa"
}
// console.log(md5('hello'))

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

let items={
  activity_id: '2207161936087949',
  create_time: '1657971717',
  device_id: 'B30874',
  nobuy: '1',
  notify_type: 'ORC_RESULT',
  out_user_id: 'VV22071600311659524524053',
  resource_info: '{"device_type":1,"video_url":"http:\\/\\/img.hahabianli.com\\/buyvideo\\/20220716\\/193609_2207161936087949_0.mp4"}',
  result: '{"type":"OUT","data":[],"excepts":[]}',
  source: 'haha',
  user_id: '2207160033320086',
  sign: '3d1181c34e09c4e8e3f29a6e5cde625b'
}
let {sign} = items
function signMd5(obj){
	delete obj.sign
	let newBBB=objKeySort(obj)
	let connects = '';
	for (let k in newBBB) {
	    connects += k+'='+ encodeURIComponent(newBBB[k])+'&';
	}
	connects=connects.substring(0,connects.length-1)+tokenObj.ticket
	console.log(connects)
	let result = md5(connects)
	// console.log('md5 result=',result)
	return result
}



console.log(signMd5(items) === sign)



