import express from 'express';
import * as cardController from '../controllers/card.controller.js';

export const router = express.Router();
router.get('/', (_req, res) => res.send('Yugioh carder server api.'));
router.get('/artwork/:passcode', cardController.getArtwork);
router.get('/card/:name', cardController.getCardInfo);
router.get('/set/:name', cardController.getSetInfo);