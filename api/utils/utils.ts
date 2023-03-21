import { load } from 'cheerio';
import { Request } from 'express';
import request from 'request-promise-native';
import { CARD_TYPE, MONSTER_PROPERTY, ST_PROPERTY } from '../constants/constant';

export const environment = process.env.NODE_ENV || 'development';

export function getMonsterType(types: string) {
	const monsterType = ['normal', 'fusion', 'synchro', 'xyz', 'link', 'ritual', 'pendulum'];
	return monsterType.find(e => types.toLowerCase().includes(e));
}

export async function crawlCard(cardName: string | number, req: Request) {
	try {
		const url = `https://yugipedia.com/wiki/${typeof cardName === "string" ? cardName.replace(" ", "_") : cardName}`;
		const response = await request(url);
		const $ = load(response);

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
			artwork: cardProperty.password === 'None' ? null : `https://${req.get('host')}/api/artwork/${Number(cardProperty.password)}`,
			isToken: cardProperty.password === 'None' && !!cardProperty.limitation_text
		}
		if (result) {
			return result;
		} else {
			console.error("Empty data.", name);
			return null;
		}
	} catch (error) {
		console.error("Can't get data:", cardName);
		console.log(error);
		return null;
	}
}