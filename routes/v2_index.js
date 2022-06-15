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

// function verifyToken(token) {
//     // 验证 Token
//     let objs = {}
//     jwt.verify(token.substring(7), 'red exchange shopping', (error, decoded) => {
//       if (error) {
//         // console.log(error.message)
//         return objs
//       }
//       // console.log(decoded)
//       objs = decoded
//     })
//     return objs
// }


console.log(md5('super8888'),md5('123456'))





































module.exports = router;
