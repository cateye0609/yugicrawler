import axios from 'axios';
import { load } from 'cheerio';
import request from 'request-promise';
import { CARD_TYPE, MONSTER_PROPERTY, ST_PROPERTY } from '../constants/constant.js';
import { getMonsterType } from '../utils/utils.js';

/* get card artwork by passcode */
export const getArtwork = async (req, res) => {
    const { passcode } = req.params;
    if (!passcode) {
        return res.status(400).send();
    }
    const url = `https://images.ygoprodeck.com/images/cards_cropped/${passcode}.jpg`;

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
};

/* get card data by name, passcode or set code */
export const getCardInfo = async (req, res) => {
    const { name } = req.params;
    if (!name) {
        return res.status(400).send();
    }
    const url = `https://yugipedia.com/wiki/${name.replace(" ", "_")}`;
    try {
        request(url, (error, response, html) => {
            if (response && response.statusCode === 200) {
                const $ = load(html);

                const name = $(".card-table > .heading").text().trim();

                const infoHtml = $(".infocolumn table.innertable tbody");
                const cardType = infoHtml.find("tr:contains('Card type') > td").text().trim();
                let cardProperty = { name, cardType };
                if (cardType === CARD_TYPE.monster) {
                    const monsterTypes = infoHtml.find(`tr:contains('Types') > td`).first().text().trim();
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
                            [prop.toLowerCase().replace(/ /g, "_")]: infoHtml.find(`tr:contains('${prop}') > td`).first().text().trim()
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
                const isJap = !$("table#cts--EN.cts").length && $("table#cts--JP.cts").find("tbody > tr").length;
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
                        monsterEffect: monsterEff.length > 1
                            ? (isExtraMonster ? `[${monsterEff[0]}]\n${monsterEff.slice(1).join("\n")}` : monsterEff.join("\n"))
                            : monsterEff[0],
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
                            name: item[isJap ? 3 : 2],
                            rarity: item[isJap ? 4 : 3],
                        }
                    }),
                    password: cardProperty.password === 'None' ? null : cardProperty.password,
                    artwork: cardProperty.password === 'None' ? null : `${req.get('host')}/api/artwork/${Number(cardProperty.password)}`,
                    isToken: cardProperty.password === 'None' && !!cardProperty.limitation_text
                }

                if (result) {
                    res.status(200).json(result);
                } else {
                    console.error("Can't get data", error);
                    res.status(404).send(error.message);
                }
            } else {
                console.error("Can't get page: ", response.statusMessage);
                res.status(500).send('Cannot get data from Yugipedia');
            }
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send(error.message);
    }
};

/* get set data by name or id */
export const getSetInfo = async (req, res) => {
    const { name } = req.params;
    const print = req.query.print;
    if (!name) {
        return res.status(400).send();
    }
    const url = `https://yugipedia.com/wiki/${(name.length < 6 ? name.toUpperCase() : name).replace(" ", "_")}`;
    try {
        request(url, (error, response, html) => {
            if (response && response.statusCode === 200) {
                const $ = load(html);

                const getSetInformationItem = (name) => $(`.infobox-yugipedia th.infobox-label:contains('${name}') + td.infobox-data`).text().trim();
                const format = getSetInformationItem('Medium');
                const type = getSetInformationItem('Type');
                const setName = $("h1#firstHeading > i").text();
                const setCode = $(".infobox-yugipedia th.infobox-label:contains('Prefix') + td.infobox-data").text().split("-")[0].trim();
                const releasedDate = $(".infobox-yugipedia tr:contains('Release dates') + tr > td.infobox-data").text().trim();
                const coverImage = $(".infobox-image > a > img").attr('src');
                const isJap = $(".set-list:last-child > table.set-list__main > tbody > tr").first().text().includes("Japanese name");
                let result = [];
                if (isJap) {
                    const setList = $(".set-list").toArray().map(e => $(e).find("table.set-list__main > tbody > tr").toArray().slice(1).map(e => $(e).children().toArray()));
                    result = setList.reduce((acc, val) => acc.concat(val.map(e => {
                        return {
                            code: $(e[0]).text(),
                            name: $(e[1]).text().slice(1, -1),
                            category: $(e[4]).text(),
                            rarity: $(e[3]).find("br").replaceWith(", ").end().text(),
                            print: $(e[5]).text(),
                        };
                    })), []);
                } else {
                    const setList = $(".set-list:last-child > table.set-list__main > tbody > tr").toArray().slice(1).map(e => $(e).children().toArray());
                    result = setList.map(e => {
                        return {
                            code: $(e[0]).text(),
                            name: $(e[1]).text().slice(1, -1),
                            category: $(e[3]).text(),
                            rarity: $(e[2]).find("br").replaceWith(", ").end().text(),
                            print: $(e[4]).text(),
                        };
                    });
                }
                if (result) {
                    const setInfo = {
                        setName,
                        setCode,
                        coverImage,
                        format,
                        type,
                        releasedDate
                    };
                    if (print) {
                        res.status(200).json({
                            ...setInfo,
                            list: result.filter(e => e.print.toLowerCase() === print.toLowerCase())
                        });
                    } else {
                        res.status(200).json({
                            ...setInfo,
                            list: result
                        });
                    }
                } else {
                    console.error("Can't get data", error);
                    res.status(404).send(error.message);
                }
            } else {
                console.error("Can't get page: ", response.statusMessage);
                res.status(500).send('Cannot get data from Yugipedia.');
            }
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send(error.message);
    }
};