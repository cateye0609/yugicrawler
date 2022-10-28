const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const request = require('request-promise');
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

app.get('/api', function (req, res) {
  res.send('Yugioh carder artwork proxy');
});

app.get('/api/artwork/:name', cors(corsOptionsDelegate), async (req, res) => {
  const { name } = req.params;
  const currentDate = new Date().toLocaleString();
  console.log(`[${req.method}] /api/artwork/${name} | ${currentDate}`);
  if (!name) {
    return res.status(400).send();
  }
  const url = `https://images.ygoprodeck.com/images/cards_cropped/${name}.jpg`;

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });
    response.data.pipe(res);
  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
});

app.get('/api/data/:name', cors(corsOptionsDelegate), async (req, res) => {
  const { name } = req.params;
  const currentDate = new Date().toLocaleString();
  console.log(`[${req.method}] /api/data/${name} | ${currentDate}`);
  if (!name) {
    return res.status(400).send();
  }
  const url = `https://yugipedia.com/wiki/${name.replace(" ", "_")}`;
  try {
    request(url, (error, response, html) => {
      if (response.statusCode !== 200) {
        console.error("Can't get page: ", response.statusMessage);
      }
      const $ = cheerio.load(html);

      const cardSetHtml = $("#English_sets").hasClass("table#cts--EN.cts")
        ? $("table#cts--EN.cts").find("tbody > tr").toArray()
        : $("table#cts--JP.cts").find("tbody > tr").toArray();
      const cardSet = cardSetHtml.slice(1).map(e => $(e).find("td").toArray());
      const cardSetData = cardSet.map(e => e.map(e2 => $(e2).text().trim()));

      const types = $("table.innertable > tbody > tr:nth-child(3) > td").text();
      const isPendulum = types.toLowerCase().includes("pendulum");
      const effect = isPendulum
        ? $('.lore dd').toArray().map(e => $(e).find("br").replaceWith("\n").end().text().trim())
        : $(".lore").find("p").find("br").replaceWith("\n").end().text().trim().split("\n");
      let effectResult = null;
      if (isPendulum) {
        const monsterEff = effect[1].split("\n");
        effectResult = {
          monsterEffect: monsterEff.length > 1 ? `[${monsterEff[0]}]\n${monsterEff[1]}` : monsterEff[0],
          pendulumEffect: effect[0]
        }
      } else {
        effectResult = {
          monsterEffect: effect.length > 1 ? `[${effect[0]}]\n${effect[1]}` : effect[0]
        };
      }
      const result = {
        effect: effectResult.monsterEffect,
        pendulumEffect: effectResult.pendulumEffect,
        cardSet: cardSetData.map(item => {
          return {
            releasedDate: item[0],
            code: item[1],
            name: item[2],
            rarity: item[3],
          }
        }),
      }

      if (response) {
        res.status(200).json(result);
      } else {
        console.error("Can't get data", error);
        res.status(404).send(error.message);
      }
    });
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