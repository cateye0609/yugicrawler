# Yugicrawler Documentation

## Install

    npm install

## Run the app

    npm start

# Endpoints

## Get card artwork

Get card artwork by passcode
<br/>
`GET /api/artwork/:passcode`

## Get card info

Get card data by name, passcode or set code
<br/>
`GET /api/card/:passcode`

**Response**
```
{
   "name":"Awakening of the Possessed",
   "cardType":"Spell",
   "property":"Continuous",
   "password":"62256492",
   "effect":"Monsters you control gain 300 ATK for each different Attribute you control. \"Charmer\" and \"Familiar-Possessed\" monsters you control cannot be destroyed by card effects. If a Spellcaster monster(s) with 1850 original ATK is Normal or Special Summoned to your field: Draw 1 card. You can only use this effect of \"Awakening of the Possessed\" once per turn.",
   "cardSet":[
      {
         "releasedDate":"2020-03-19",
         "code":"DUOV-EN030",
         "name":"Duel Overload",
         "rarity":"Ultra Rare"
      },
      {
         "releasedDate":"2020-10-22",
         "code":"SDCH-EN020",
         "name":"Structure Deck: Spirit Charmers",
         "rarity":"Common"
      }
   ],
   "artwork":"https://yugicrawler.vercel.app/api/artwork/62256492"
}
```
## Get set info

Get set data by name or code
<br/>
`GET /api/set/:name`

**Parameters**

|          Name | Required |  Type   | Description                                                                                                                                                           |
| -------------:|:--------:|:-------:| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     `print` | optional | string  | Get cards by specific print. <br/> Supported values: `new`                                                                                                   |

**Response**

```
{
   "setName":"Structure Deck: Spirit Charmers",
   "setCode":"SDCH",
   "coverImage":"https://ms.yugipedia.com//thumb/2/2c/SDCH-DeckEN.png/257px-SDCH-DeckEN.png",
   "format":"TCG",
   "type":"Structure Deck",
   "releasedDate":"November 20, 2020",
   "list":[
      {
         "code":"SDCH-EN005",
         "name":"Awakening of the Possessed - Nefariouser Archfiend",
         "category":"Effect Monster",
         "rarity":"Ultra Rare",
         "print":"New"
      },
      {
         "code":"SDCH-EN006",
         "name":"Awakening of the Possessed - Greater Inari Fire",
         "category":"Effect Monster",
         "rarity":"Ultra Rare",
         "print":"New"
      },
      {
         "code":"SDCH-EN019",
         "name":"Grand Spiritual Art - Ichirin",
         "category":"Field Spell",
         "rarity":"Ultra Rare",
         "print":"New"
      },
      {
         "code":"SDCH-EN028",
         "name":"Possessed Partnerships",
         "category":"Normal Trap",
         "rarity":"Super Rare",
         "print":"New"
      },
      {
         "code":"SDCH-EN041",
         "name":"Spirit Charmers",
         "category":"Quick-Play Spell",
         "rarity":"Ultra Rare",
         "print":"New"
      }
   ]
}
```
