import md5 from 'js-md5';
function objKeySort(obj, type='asc'){
	if(type == 'asc'){
		var newkey = Object.keys(obj).sort()
	}else{
		var newkey = Object.keys(obj).sort().reverse()
	}
	let newObj={}
	for(let k of newkey){
		newObj[k] = obj[k]
	}
	return newObj;
}

exports.signFun = function(data){
	let secret = 'SNlb3Ifj3efHKHf0Mil2NHyKBYotI6KO';
	let newObj = objKeySort(data);
	let connects = '';
	for (let item in newObj) {
		if(newObj[item]&&newObj[item]!=''){ // 非空参数
			connects += item+'='+ newObj[item]+'&';
		}
	}
	connects += "secret="+secret;
	console.log('拼接格式后', connects);
	return md5(connects).toUpperCase();
}