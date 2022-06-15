const mysql = require('mysql');

class MysqlPool {
  constructor(){
    this.flag = true;
    this.pool = mysql.createPool({
        // host:'115.227.18.87',
        // user:'redshop',
        // password:'dfdpYcwPEcRr8yhz',

        host:'localhost',
        user:'root',
        password:'123456',
        database: 'redShop',
        charset: 'UTF8MB4_GENERAL_CI',
        multipleStatements: true //允许执行多条语句
    });
  }
  getPool(){
    if(this.flag){
      this.pool.on('connection', (connection)=>{
        connection.query('SET SESSION auto_increment_increment=1');
        this.flag = false;
      });
    }
    return this.pool;
  }  
}

// Ftp AGXNEkcBBLyw6Bi4  datas_ftp

// root Ihavenotpassword2020#

 
module.exports = MysqlPool;