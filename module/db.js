var sqlite3 = require('sqlite3').verbose();
var dbPath = `${__dirname}/db.db`;

let db = new sqlite3.Database(dbPath/*dbPath*/, sqlite3.OPEN_READWRITE, (err) => {
    try {
        if (err) {
            console.error(err.message);
        } else {
            console.log('복구 DB 를 성공적으로 연결 하였습니다!');

        }
    } catch(err) {
        console.log(err)
    }
}); 

// db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, 'User', (err, row) => {
//         if(row === undefined) { // if문을 통해 테이블이 존재하는지 여부 확인
//             try {
//                 db.run('CREATE TABLE User (id, access_token, refresh_token, server, backup_key)') // 테이블 생성
//                 console.log("User 테이블 생성")
//             } catch(err) {
            
//             }
//         }
//   })

// db.get(`SELECT name FROM sqlite_master WHERE trpe='table' AND name=?`, 'Key', (err, row) => {
//         if(row === undefined) {
//             try {
//                 db.run('CREATE TABLE key (key, day, id, backup_key, expiration, use)') // 테이블 생성
//                 console.log("Key 테이블 생성")
//             } catch(err) {
            
//             }
//         }
// })

// db.get(`SELECT name FROM sqlite_master WHERE trpe='table' AND name=?`, 'Server', (err, row) => {
//         if(row === undefined) {
//             try {
//                 db.run('CREATE TABLE Server (id, roleid, web_hook)') // 테이블 생성
//                 console.log("Server 테이블 생성")
//             } catch(err) {
            
//             }
//         }
// })


module.exports.db = db