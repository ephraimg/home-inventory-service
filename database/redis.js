import Promise from 'bluebird';
import redis from 'redis';

// These two used for starting Redis. Using npm script instead.
// const sys = require('util');
// const exec = require('child_process').exec;

// Code below starts Redis. Using npm script instead.
// function puts(error, stdout) {
//   sys.puts(stdout);
// }
// exec('redis-server /usr/local/etc/redis.conf', puts);

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);


const redisDB = process.env.LOCAL === '1'
  ? redis.createClient(process.env.REDIS_LOCAL_URL)
  : redis.createClient(process.env.REDIS_AWS_URL);

export default redisDB;
