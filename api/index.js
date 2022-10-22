const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const allowOrigins = ['http://localhost:3000', 'https://yugioh-carder.vercel.app'];
const corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (allowOrigins.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions); // callback expects two parameters: error and options
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return next();
});

app.get('/', function (req, res) {
  res.send('Yugioh carder artwork proxy');
});

app.get('/api/artwork/:name', cors(corsOptionsDelegate), async (req, res) => {
  const { name } = req.params;
  if (!name) {
    return res.status(404).send();
  }
  const url = `https://images.ygoprodeck.com/images/cards_cropped/${name}.jpg`;

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });
    response.data.pipe(res);
    const currentDate =  new Date().toLocaleString();
    console.log(`${currentDate} | ${name}`);
  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, function () {

  const host = server.address().address;
  const port = server.address().port;

  console.log("Yugioh-carder server is running at: http://%s:%s", host, port)
})