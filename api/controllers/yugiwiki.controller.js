import { load } from 'cheerio';
import request from 'request-promise-native';
import { CARD_TYPE, YUGIWIKI_MONSTER_PROPERTY, YUGIWIKI_ST_PROPERTY } from '../constants/constant.js';
import statusMsg from '../constants/message.js';
import ApiError from '../utils/apiError.js';
import { environment, getMonsterType } from '../utils/utils.js';

/* get card data by name, passcode or set code */
export const getCardInfo = (req, res, next) => {
    const { name } = req.params;
    const url = `https://yugioh.fandom.com/wiki/${name.replace(" ", "_")}`;
    request(url)
        .then(html => {
            const $ = load(html);

            const name = $(".cardtable .cardtable-header").contents().first().text().trim();

            const dataTableHtml = $("table.cardtable tbody");
            const cardType = dataTableHtml.find(".cardtablerow:contains('Card type') > td").text().trim();
            let cardProperty = { name, cardType };
            if (cardType === CARD_TYPE.monster) {
                const monsterTypes = dataTableHtml.find(`.cardtablerow:contains('Types') > td`).first().text().trim();
                const isToken = monsterTypes.includes("Token");
                const type = getMonsterType(monsterTypes);
                let propsList = [];
                switch (type) {
                    case "xyz":
                        propsList = YUGIWIKI_MONSTER_PROPERTY.xyz;
                        break;
                    case "pendulum":
                        propsList = YUGIWIKI_MONSTER_PROPERTY.pendulum;
                        break
                    case "link":
                        propsList = YUGIWIKI_MONSTER_PROPERTY.link;
                        break;
                    default:
                        propsList = YUGIWIKI_MONSTER_PROPERTY.monster;
                        break;
                }

                if (type !== "pendulum" && monsterTypes.toLowerCase().includes("pendulum")) {
                    propsList = [...new Set([...propsList, ...YUGIWIKI_MONSTER_PROPERTY.pendulum])];
                }

                if (type === "link") {
                    const atkLink = dataTableHtml.find(`.cardtablerow:contains('ATK / LINK') > td`).text().trim().split("/");
                    const linkArrows = dataTableHtml.find(`.cardtablerow:contains('Link Arrows') > td`).text().trim().split(",").map(e => e.trim());
                    cardProperty = {
                        ...cardProperty,
                        atk: atkLink[0].trim(),
                        linkRating: atkLink[1].trim(),
                        linkArrows
                    }
                } else {
                    const atkDef = dataTableHtml.find(`.cardtablerow:contains('ATK / DEF') > td`).text().trim().split("/");
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
                        [prop.toLowerCase().replace(/ /g, "_")]: dataTableHtml.find(`.cardtablerow:contains('${prop}') > td`).first().text().trim(),
                        isToken
                    }
                });
            } else {
                YUGIWIKI_ST_PROPERTY.forEach(prop => {
                    cardProperty = {
                        ...cardProperty,
                        [prop.toLowerCase()]: dataTableHtml.find(`.cardtablerow:contains('${prop}') > td`).text().trim()
                    }
                });
            }

            const hasTcgSet = $(".cardtablerow:contains('TCG sets')").length;
            const cardSetHTML = hasTcgSet
                ? $(".cardtablerow:contains('TCG sets') table.hlist:contains('English') .cardSet > div")
                : $(".cardtablerow:contains('OCG sets') table.hlist:contains('Japanese') .cardSet > div");
            const cardSet = cardSetHTML.toArray().slice(1).map(e => {
                const setinfo = $(e).find("span").toArray().map(e2 => $(e2).text());
                return {
                    releasedDate: setinfo[0],
                    code: setinfo[1],
                    name: setinfo[2],
                    rarity: setinfo[hasTcgSet ? 3 : 4],
                }
            });
            const types = $("table.cardtable > tbody > .cardtablerow:contains('Types') > td").text();
            const isPendulum = types.toLowerCase().includes("pendulum");
            const extraDeckTypes = ['fusion', 'synchro', 'xyz', 'link'];
            const isExtraMonster = extraDeckTypes.findIndex(e => types.toLowerCase().includes(e)) > -1;

            const effect = isPendulum
                ? $('.lore dd').toArray().map(e => $(e).find("br").replaceWith("\n").end().text().trim())
                : $('.cardtablerow:contains("Card descriptions") table:contains("English") td.navbox-list').find("br").replaceWith("\n").end().text().trim().split("\n");
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
                cardSet,
                passcode: cardProperty.passcode === 'None' ? null : cardProperty.passcode,
                artwork: cardProperty.passcode === 'None' ? null : `${environment === 'development' ? 'http' : 'https'}://${req.get('host')}/api/artwork/${Number(cardProperty.passcode)}`,
                isToken: (cardProperty.passcode === 'None' && !!cardProperty.limitation_text) || cardProperty.isToken
            }

            if (result) {
                res.status(200).json(result);
            } else {
                throw new ApiError(404, statusMsg.notFound);
            }
        })
        .catch(err => next(new ApiError(err.statusCode, err.response.statusMessage)));
}