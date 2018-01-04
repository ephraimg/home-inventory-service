import * as mysql from 'mysql';
import { Promise } from 'bluebird';
import {} from 'dotenv/config';

Promise.promisifyAll(require('mysql/lib/Connection').prototype);
// Promise.promisifyAll(require('mysql/lib/Pool').prototype);

let options;

if (process.env.LOCAL === '1') {
  options = {
    host: process.env.SQL_LOCAL_HOST,
    user: process.env.SQL_LOCAL_USERNAME,
    password: process.env.SQL_LOCAL_PASSWORD,
  };
} else {
  options = {
    host: process.env.SQL_AWS_HOST,
    user: process.env.SQL_AWS_USERNAME,
    password: process.env.SQL_AWS_PASSWORD,
  };
}

const connection = mysql.createConnection(options);

connection.pingAsync()
  .then(() => (process.env.TEST === '1'
    ? connection.queryAsync('USE airbnb_test')
    : connection.queryAsync('USE airbnb')))
  .catch(err => console.log('Problem connecting mySQL\n', err));


export default connection;
