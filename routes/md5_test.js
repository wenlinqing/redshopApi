
const md5 = require('js-md5')

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
  'name':'Tom',
  'age':20,
  'score':[80,90,70],
  'data':{"type":"IN","data":{"quecaosihuanatie":1}}
}

let newBBB=objKeySort(items)
let connects = '';
for (let k in newBBB) {
    connects += k+'='+ encodeURIComponent(newBBB[k])+'&';
}
connects=connects.substring(0,connects.length-1)+'f71b31de9e7b8cefa8bb451bc54f9fab'
console.log(connects)

// let str = 'age=20&data=%7B%22type%22%3A%22IN%22%2C%22data%22%3A%7B%22quecaosihuanatie%22%3A1%7D%7D&name=
// Tom&score=%5B80%2C90%2C70%5D f71b31de9e7b8cefa8bb451bc54f9fab'

console.log(md5(connects))






