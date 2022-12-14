import express from 'express';
import * as cardController from '../controllers/card.controller.js';
import * as cardsController from '../controllers/cards.controller.js';

const router = express.Router();
router.get('/', (_req, res) => res.send('Yugioh carder server api.'));
router.get('/artwork/:passcode', cardController.getArtwork);
router.get('/card/:name', cardController.getCardInfo);
router.get('/set/:name', cardController.getSetInfo);
router.post('/cards', cardsController.getMutipleCards);

export default router;