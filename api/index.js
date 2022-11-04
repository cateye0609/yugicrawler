import axios from 'axios';
import { load } from 'cheerio';
import cors from 'cors';
import express from 'express';
import request from 'request-promise';
import { CARD_TYPE, MONSTER_PROPERTY, ST_PROPERTY } from './constant.js';
import { getMonsterType } from './utils.js';

const app = express();

/* use cors */
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
/* root */
app.get('/api', function (req, res) {
  res.send('Yugioh carder artwork proxy');
});
/* get card artwork */
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
// get card data by name
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
      const $ = load(html);

      const name = $(".card-table > .heading").text().trim();

      const infoHtml = $(".infocolumn table.innertable tbody");
      const cardType = infoHtml.find("tr:contains('Card type') > td").text().trim();
      let cardProperty = { name, cardType };
      if (cardType === CARD_TYPE.monster) {
        const monsterTypes = infoHtml.find(`tr:contains('Types') > td`).text().trim();
        const type = getMonsterType(monsterTypes);
        let propsList = [];
        switch (type) {
          case "xyz":
            propsList = MONSTER_PROPERTY.xyz;
            break;
          case "pendulum":
            propsList = MONSTER_PROPERTY.pendulum;
            break
          case "link":
            propsList = MONSTER_PROPERTY.link;
            break;
          default:
            propsList = MONSTER_PROPERTY.monster;
            break;
        }

        if (type === "link") {
          const atkLink = infoHtml.find(`tr:contains('ATK / LINK') > td`).text().trim().split("/");
          const linkArrows = infoHtml.find(`tr:contains('Link Arrows') > td`).text().trim().split(",").map(e => e.trim());
          cardProperty = {
            ...cardProperty,
            atk: atkLink[0].trim(),
            linkRating: atkLink[1].trim(),
            linkArrows
          }
        } else {
          const atkDef = infoHtml.find(`tr:contains('ATK / DEF') > td`).text().trim().split("/");
          cardProperty = {
            ...cardProperty,
            atk: atkDef[0].trim(),
            def: atkDef[1].trim(),
          }
        }

        propsList.forEach(prop => {
          cardProperty = {
            ...cardProperty,
            monsterTypes,
            [prop.toLowerCase().replace(/ /g, "_")]: infoHtml.find(`tr:contains('${prop}') > td`).text().trim()
          }
        });
      } else {
        ST_PROPERTY.forEach(prop => {
          cardProperty = {
            ...cardProperty,
            [prop.toLowerCase()]: infoHtml.find(`tr:contains('${prop}') > td`).text().trim()
          }
        });
      }

      const cardSetHtml = $("table#cts--EN.cts").length
        ? $("table#cts--EN.cts").find("tbody > tr").toArray()
        : $("table#cts--JP.cts").find("tbody > tr").toArray();
      const cardSet = cardSetHtml.slice(1).map(e => $(e).find("td").toArray());
      const cardSetData = cardSet.map(e => e.map(e2 => $(e2).text().trim()));

      const types = $("table.innertable > tbody > tr:nth-child(3) > td").text();
      const isPendulum = types.toLowerCase().includes("pendulum");
      const extraDeckTypes = ['fusion', 'synchro', 'xyz', 'link'];
      const isExtraMonster = extraDeckTypes.findIndex(e => types.toLowerCase().includes(e)) > -1;

      const effect = isPendulum
        ? $('.lore dd').toArray().map(e => $(e).find("br").replaceWith("\n").end().text().trim())
        : $(".lore > p").find("br").replaceWith("\n").end().text().trim().split("\n");
      let effectResult = null;
      if (isPendulum) {
        const monsterEff = effect[1].split("\n");
        effectResult = {
          monsterEffect: monsterEff.length > 1 ? `[${monsterEff[0]}]\n${monsterEff.slice(1).join("\n")}` : monsterEff[0],
          pendulumEffect: effect[0]
        }
      } else {
        effectResult = {
          monsterEffect: effect.length > 1
            ? (isExtraMonster ? `[${effect[0]}]\n${effect.slice(1).join("\n")}` : effect.join("\n"))
            : effect[0]
        };
      }

      const result = {
        ...cardProperty,
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
});