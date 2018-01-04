import {} from 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import sql from '../database/index';
import sqs from './setupSQS';
import './handleSQS';


sql.pingAsync()
  .catch(err => console.log('Error: No response to mySQL ping \n', err))
  .then(() => (process.env.TEST === '1'
    ? sql.queryAsync('USE airbnb_test')
    : sql.queryAsync('USE airbnb')
  ))
  .tap(() => console.log('Connected to mySQL'))
  .catch(err => console.log('Error: Can\'t connect to the right database \n', err));

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Welcome to the home inventory service'));

app.get('/homes?:id', (req, res) => (
  // Note, this object syntax isn't supported for batch inserting!
  sql.queryAsync('SELECT homes.id, cities.name AS city, neighborhoods.name AS neighborhood, ' +
      'max_guests, price_usd, instant_book, entire_home, private, parent_id, photos ' +
      'FROM ((homes INNER JOIN cities ON homes.id_cities = cities.id) ' +
      'INNER JOIN neighborhoods on homes.id_neighborhoods = neighborhoods.id) ' +
      'WHERE homes.id = ?', [req.query.id])
    .then(rows => res.send(rows[0]))
    .catch(err => {
      console.log(err);
      res.status(500).send(err);
    })
));

app.post('/homes', (req, res) => (
  // Note, this object syntax isn't supported for batch inserting!
  sql.queryAsync('INSERT INTO homes SET ?', [req.body])
    .then(result => {
      req.body.id = result.insertId;
      const home = JSON.stringify(req.body);
      return Promise.all([
        // Send confirmation response to user
        Promise.resolve(res.status(201).send(req.body)),
        // Notify other service of new home
        sqs.sendToReservations(home),
        sqs.sendToClient(home)
      ]);
    })
    .catch(err => res.status(500).send(err))
));

app.patch('/homes', (req, res) => (
  sql.queryAsync('UPDATE homes SET ? WHERE id = ?', [req.body, req.body.id])
    .then(() => sql.queryAsync('SELECT * FROM homes WHERE id = ?', req.body.id))
    .then(rows => {
      const home = JSON.stringify(rows[0]);
      return Promise.all([
        // Send confirmation response to user
        Promise.resolve(res.status(201).send(rows[0])),
        // Notify other service of update
        sqs.sendToClient(home),
        sqs.sendToReservations(home),
      ]);
    })
    .catch(err => res.status(500).send(err))
));

if (!module.parent) {
  app.listen(process.env.PORT, () =>
    console.log(`Express server is listening on port ${process.env.PORT}`));
}

export default app; // this is for test suite
