import { load } from 'cheerio';
import * as fs from 'fs';
import request from 'request-promise-native';
import * as ydke from "ydke";
import { CARD_TYPE, YUGIPEDIA_MONSTER_PROPERTY, YUGIPEDIA_ST_PROPERTY } from '../constants/constant.js';
import statusMsg from '../constants/message.js';
import ApiError from '../utils/apiError.js';
import { environment, getMonsterType } from '../utils/utils.js';


/* get card data by name, passcode or set code */
export const getCardInfo = (req, res, next) => {
    const { name } = req.params;
    const url = `https://yugipedia.com/wiki/${name.replace(" ", "_")}`;
    request(url)
        .then(html => {
            const $ = load(html);

            const name = $(".card-table > .heading").text().trim();

            const infoHtml = $(".infocolumn table.innertable tbody");
            const cardType = infoHtml.find("tr:contains('Card type') > td").text().trim();
            let cardProperty = { name, cardType };
            if (cardType === CARD_TYPE.monster) {
                const monsterTypes = infoHtml.find(`tr:contains('Types') > td`).first().text().trim();
                const isToken = monsterTypes.includes("Token");
                const type = getMonsterType(monsterTypes);
                let propsList = [];
                switch (type) {
                    case "xyz":
                        propsList = YUGIPEDIA_MONSTER_PROPERTY.xyz;
                        break;
                    case "pendulum":
                        propsList = YUGIPEDIA_MONSTER_PROPERTY.pendulum;
                        break
                    case "link":
                        propsList = YUGIPEDIA_MONSTER_PROPERTY.link;
                        break;
                    default:
                        propsList = YUGIPEDIA_MONSTER_PROPERTY.monster;
                        break;
                }

                if (type !== "pendulum" && monsterTypes.toLowerCase().includes("pendulum")) {
                    propsList = [...new Set([...propsList, ...YUGIPEDIA_MONSTER_PROPERTY.pendulum])];
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
                        [prop.toLowerCase().replace(/ /g, "_")]: infoHtml.find(`tr:contains('${prop}') > td`).first().text().trim(),
                        isToken
                    }
                });
            } else {
                YUGIPEDIA_ST_PROPERTY.forEach(prop => {
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
            const cardSetData = cardSet.map(e => e.map(e2 => $(e2).find("br").replaceWith(", ").end().text().trim()));

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
                        name: item[2],
                        rarity: item[isJap ? 4 : 3],
                    }
                }),
                password: cardProperty.password === 'None' ? null : cardProperty.password,
                artwork: cardProperty.password === 'None' ? null : `${environment === 'development' ? 'http' : 'https'}://${req.get('host')}/api/artwork/${Number(cardProperty.password)}`,
                isToken: (cardProperty.password === 'None' && !!cardProperty.limitation_text) || cardProperty.isToken
            }

            if (result) {
                res.status(200).json(result);
            } else {
                throw new ApiError(404, statusMsg.notFound);
            }
        })
        .catch(err => next(new ApiError(err.statusCode, err.response.statusMessage, err.stack)));
}

/* get set data by name or id */
export const getSetInfo = (req, res, next) => {
    const { name } = req.params;
    const print = req.query.print;
    const url = `https://yugipedia.com/wiki/${(name.length < 6 ? name.toUpperCase() : name).replace(" ", "_")}`;
    request(url)
        .then(html => {
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
                        print: $(e[5]).text() || "New",
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
                throw new ApiError(404, statusMsg.notFound);
            }
        })
        .catch(err => next(new ApiError(err.statusCode, err.response?.statusMessage, err.stack)));
}

export const getMutipleCards = async (req, res, next) => {
    if (req.body.list && req.body.list.length) {
        const list = [...new Set(req.body.list)];
        try {
            const result = await Promise.all(list.map(item => crawlCard(item, req)));
            res.status(200).json(result.filter(item => !!item));
        } catch (error) {
            next(error);
        }
    } else if (req.file) {
        const path = process.cwd() + `/uploads/${req.file.filename}`;
        const contents = fs.readFileSync(path).toString();
        let list = [];
        if (contents.length) {
            list = [...new Set(contents.split(/\r?\n/).filter(e => Number(e)))];
            try {
                const result = await Promise.all(list.map(item => crawlCard(item, req)));
                res.status(200).json(result.filter(item => !!item));
                fs.unlink(path, () => { console.log(`Deleted file ${req.file.filename}`); });
            } catch (error) {
                next(error);
            }
        }
    } else if (req.body.ydke) {
        const deck = ydke.parseURL(req.body.ydke);
        const list = [...new Set([...deck.main, ...deck.extra, ...deck.side])];
        try {
            const result = await Promise.all(list.map(item => crawlCard(item, req)));
            res.status(200).json(result.filter(item => !!item));
        } catch (error) {
            next(error);
        }
    } else {
        next(new ApiError(400, statusMsg.wrongFormat));
    }
}