import express from 'express';
import multer from 'multer';
import * as cardController from '../controllers/card.controller.js';
import * as cardsController from '../controllers/cards.controller.js';

const upload = multer({ dest: '/tmp/' })
const router = express.Router();
router.get('/', (_req, res) => res.send('Yugicrawler API.'));
router.get('/artwork/:passcode', cardController.getArtwork);
router.get('/card/:name', cardController.getCardInfo);
router.get('/set/:name', cardController.getSetInfo);
router.post('/cards', upload.single("file"), cardsController.getMutipleCards);

export default router;