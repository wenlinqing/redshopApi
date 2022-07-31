const {decryptoFun} = require('./sha256Sign.js')
// const crypto = require('crypto')
let ciphertext='xDJV9aURVDs5F6T3xW97VVaPvv/AhWyiVvSgiXM4HyyeHhazPKuuKIq44/DiKhs7aGaGqRR+9yPfX6lB0o7btbLTId96wlV43lEm/igY4DYFYmpy2FbkE4R+dZY7RmWvEJUzpiaKU41/DjSV2Vx1Q42dPgmVLz0fBbBMeX6snqgfHM2VpNwe1CD7uZ5vvIZYC/NTRGXssaUoJeebdGwRkL0qJswKhf2GFLJ4Dj2ylEt/4Ko6doJZP5ns+6E1CHRyHJtCW1m2WUZ6JJXZQ0JlVtQZtDgq6MBYzbSdXRBYHzHc0+RtoaQNMoSkLcmRRVlUMu96zXIpnJK1d9zsUwGFiTlLXjNlxKmHbgOSeIHVhlU5msnb6qR6b3Da1QmdRqszPM3hNEx7VpLJ0aq85r3PH41A+3W6oHPVPvtjwe+DBXZdC2+hA6jcNMGMQpdDrWOrMksFKLCXC+9r3uU5X8ev/n3cWIcWPaXtY5Ytzyo/By2vF+UGeCilgFrrTR1jjwd1zYzM8dBEvBO34uTjubvGBsvVX1GCnxHsP4/H4rZsVpp+m+aaIhIJWl0bj6hLWzoZU37DkJVdVf3wt3TpfJjVz3nbA8CZSod+RajLPEcNJ2e/926YUTEEWfcxowJaEDXdnmUNo6o3SGtFoZvs5CZdJ6rQ71z0lKtrx3pbsMI8tGVZ/Uya8u6+9wWUACr8W1NvcIyT+C0kjM9eDsgKnm82VrtvneiBhWPWoF4kjiXf9EDG7rooduAwmprsmiFCtnCPAwAtQSxEvM6T8HH/hzu8CoP1tcmerHZxjrykyxjBK6bm1GSuTgkr9EMt7Q=='
// let encrypted = Buffer.from(ciphertext, 'base64')
let key='vODZxv72pSR3RGslTJkKkmFdJgjqtagz'
// let decipher = crypto.createDecipheriv('AES-256-GCM', key, '2j2e5s61A8lo')

// decipher.setAuthTag(encrypted.slice(-16))
// decipher.setAAD(Buffer.from('payscore'))

// let output = Buffer.concat([
//     decipher.update(encrypted.slice(0, -16)),
//     decipher.final()
// ])

// console.log(output.toString())




// console.log(decryptoFun(ciphertext,'ZgOUd5aHsAKH','payscore', key))

let oo="VV22071600311659524524053,B30874"
console.log(typeof(oo),oo.split(','))


