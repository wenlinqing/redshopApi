const { KEYUTIL, KJUR, hextob64, b64tohex } = require('jsrsasign')
const crypto = require('crypto')
const stringRandom = require('string-random');

const pubKey=`
-----BEGIN CERTIFICATE-----
MIID3DCCAsSgAwIBAgIULNRACrmADm/JB3Q3XMoGcuPvb1MwDQYJKoZIhvcNAQELBQAwXjELMAkGA1UEBhMCQ04xEzARBgNVBAoTClRlbnBheS5jb20xHTAbBgNVBAsTFFRlbnBheS5jb20gQ0EgQ2VudGVyMRswGQYDVQQDExJUZW5wYXkuY29tIFJvb3QgQ0EwHhcNMjIwNzEzMTQxNTEwWhcNMjcwNzEyMTQxNTEwWjBuMRgwFgYDVQQDDA9UZW5wYXkuY29tIHNpZ24xEzARBgNVBAoMClRlbnBheS5jb20xHTAbBgNVBAsMFFRlbnBheS5jb20gQ0EgQ2VudGVyMQswCQYDVQQGDAJDTjERMA8GA1UEBwwIU2hlblpoZW4wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDMBY2LOMIy++if7Vn2+tMer8TL8lx7d8Y7y+f/7HuKAAyFnOBgF/YPa4f0roc1qKZFUTnnO9EI+umg5nzPW0CjV1KV3nPgiPNhZ4FR2FAuaIvL2kCRvMNToKeEKcoXLBF88jcKQOSQ8P1UJGQ/HqfBWMJD4sudpzVEDIKsmgpJxXR3Hz8j52bow1YBolGGR+9crfV7eSolCFwOm0rjwIZvG0x90+qYHUenCqkYy+zvbWceSXcAwrC5ntQ9RgUkOHADiBDoXsRoJjQEUmY52AafrZaTuG9nW/jK37kJHBtq2R/mID8+h615QJQizZMZLUcG1Xs2rEqNL5r5xoAizVN/AgMBAAGjgYEwfzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIE8DBlBgNVHR8EXjBcMFqgWKBWhlRodHRwOi8vZXZjYS5pdHJ1cy5jb20uY24vcHVibGljL2l0cnVzY3JsP0NBPTFCRDQyMjBFNTBEQkMwNEIwNkFEMzk3NTQ5ODQ2QzAxQzNFOEVCRDIwDQYJKoZIhvcNAQELBQADggEBALqVU9gIwb4wlB1XhbAarUBzsxi2W6yCxIhdR/EQRnAkunNhQ4dMCfrPdj5uPv1J1l4Kc6QYrkrLQ1h9KWnN2d1flv90nQmX+myaXeaC6UGEQ80JOtMZWInHubCiWqZNOz4VbcYqICMPcYBGh86mbntsYUZ2Rkg9UZRnszVgn7s+eu10IQ/3TBVcTzQUVAGD93mrG3pRUSn8s8GcidKlOyqD3D+IGT8Sqv1ZKGedlG3GE4krEpbXg7If5W7PqW1hAnx4gRupokNGoPgw5pd4zcUiFKJo7EpF995gFBh+tK3nNBqrPGup/xCj51Y30/wwbedyE5tRD8VbxoWpo2FNRUI=
-----END CERTIFICATE-----
`

const priKey=`-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDXxd6hFEWVqhaaosofXBUcCN2Onu+zGkcmQXnLTcH2sANU5+1hyD++lo8VA3s3wkFEJlpsySU+qyNufFt4pIc5uni+9o8howEID/HsMAHRDwuuFbbgFREcNYuwhmynX0kTezMEaBvIzgZFVW4mW9OiTvMLYcDYdrJsq/ozqOvyHifcaQy6Rwy8IgxASj3cnGG8vG5wIQo8sm4+e+I+Hib+l2B71UKSQuYv/hSvWMs2Xh1eS1as8bAo+cs7fnYgKhEmolc0J4ew3pDd
eOYovZTvGhN0BSUyzrvuBrnnSFCbCYOThtmP+DcqxU/+DZmIBLzXNSSZXpeKuEYNUojiCZNLAgMBAAECggEAb88w1fdTN4Kzw92nLyjgJ27QoB7rxrtPMxuqqRbZ86Kxl0W3VHwXzALokdMD/pjCiTX2lXiFvDuiWJZIL/PRvrBJ8WqCMMPuvObGTcVyq4pIWyUVZniELUHx6L8/flt52oZ0oUvxWdSomzTxpx7eQ7T1bGhzLbgULQvQ0wQtf3/9Hf84wqyTqpEK5TXhhjSOEvZ73q1LBgECfpOSy09C+U1MtUtsNDsNBCuFzpVs2iI1YI3/Dlab8GO0X2c6jppaPDcYMb+2CtlWrRtEjr+Yf+HC449SMMZ3pxBKMx3gLFQl4mOOZBvfhORf8EiCoRQLu8FIwDspITjkXBsySxdzwQKBgQDzY/R/99rjjQG5x088
9ZN8XRxAGnv0LvI/vKjXnBLm/hckpfxBWSBDAnjYpkqMx24Ck7w6iQa3Za6V/Dn50uxDANUfWdnRGe3OtK5/36Yxxu6IN4pusJcG25Hz7umK8KXzlsmMdVUxJYbchEslRQQvxzctqBirgBFv9nH8RUwItQKBgQDi86DS8Q8uYHtIeZPjrvbkePrzYF7gehczJ2EsStNb62REQjeNvUWbCtcdkJmGgKzOe6csz/06M+NikvIIOoJtbWAH17YLa9N/l8y9K+6gQEaKSqJ4wRyv2BSD2U/aCFA/bdz0wgeltKU8n0RFgy2QQpyJO+ccQOl+L3xFpQyr/wKBgQDUEI1iSoTvq1aLljtWM+qzezU4LVs/IQB1xF2grx5RIabsiatHDO7tM+QzcICYNNOHb02b+vRdKz149XFWWQ7+OmV3kYQVivAHIKrCRA28ZUZEbZAyba7JjNqYndvi8VbG7OTjewAleDsPPD11VbMWJg/Puhz0oPuQgDxEv+RF2QKBgENp0My31CWXfSdTDc3k6+uD0C844hXVzkxglym79Dpqmnb4IF5W6XUbbDiY+jGMyUfwTQEvqu19+j4Onhw5nQJ6KbtKpQWRetp8sdFDWnd5gDqV3tr1qdrF2Zosk96U95lPvgFqHTFojmiKepIXXBJs5uiQxZ6L3Y+g9U4Or8vrAoGAE8dTMibaNhe+ThYasbUV3owbkknE1J1kzBpwYMEU1OYeodijY9962VRXNzZq1GzYcz/zF8egE0DFWrlHH7nk
yBZ8hNt24aLKK0poUnneyXNZ0uNW3HeAyubGYFyXazaYiZPKf5scMPe44MuESgZ4LeGVfErmIymkYFsgn4aKMc4=
-----END PRIVATE KEY-----`

function sha256Sign(str){
	const key = KEYUTIL.getKey(priKey, '1626826768')
	const signature=new KJUR.crypto.Signature({alg:'SHA256withRSA'})
	signature.init(key)
	signature.updateString(str)
	return hextob64(signature.sign())
}

exports.sha256SignVerify=function(str, sign){
	let signatureVf=new KJUR.crypto.Signature({alg:'SHA256withRSA', prvkeypem:pubKey})
	signatureVf.updateString(str)
	let b=signatureVf.verify(b64tohex(sign))
	return b;
}

exports.decryptoFun=function(ciphertext,nonce,associated_data,apiv3){
	let encrypted = Buffer.from(ciphertext, 'base64')
	let decipher = crypto.createDecipheriv('AES-256-GCM', apiv3, nonce)

	decipher.setAuthTag(encrypted.slice(-16))
	decipher.setAAD(Buffer.from(associated_data))

	let output = Buffer.concat([
	    decipher.update(encrypted.slice(0, -16)),
	    decipher.final()
	])
	let result=output.toString()
	// console.log(typeof(result),'result===',result)
	return JSON.parse(result)
}




exports.wxRequestHeader=function(method='GET',url,data=''){
	let timeStamp=Math.floor(new Date().getTime()/1000)
	// let nonce_str= data==''?stringRandom(32):signFun(JSON.parse(data))
	let nonce_str= stringRandom(32)
	let signObj=`${method}\n${url}\n${timeStamp}\n${nonce_str}\n${data}\n`
	// console.log(signObj)
	let headers= {
		"Content-Type": 'application/json',
		"Accept": 'application/json',
		"User-Agent": '*/*',
		"Authorization": `WECHATPAY2-SHA256-RSA2048 mchid="${global.MCHOBJ.mchid}",nonce_str="${ nonce_str }",signature="${sha256Sign(signObj)}",timestamp="${ timeStamp }",serial_no="${global.MCHOBJ.serial_no}"`
	}
	// console.log('headers', headers )
	return headers;
}







