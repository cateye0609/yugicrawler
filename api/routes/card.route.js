import express from 'express';
import multer from 'multer';
import { getArtwork } from "../controllers/artwork.controller.js";
import * as yugipediaController from '../controllers/yugipedia.controller.js';
import * as yugiwikiController from '../controllers/yugiwiki.controller.js';

const isAltSource = process.env.ALT_SOURCE === "true" || true;
const upload = multer({ dest: '/tmp/' })
const router = express.Router();
router.get('/', (_req, res) => res.send('Yugicrawler API.'));
router.get('/artwork/:passcode', getArtwork);
router.get('/card/:name', isAltSource ? yugiwikiController.getCardInfo : yugipediaController.getCardInfo);
router.get('/set/:name', yugipediaController.getSetInfo);
router.post('/cards', upload.single("file"), yugipediaController.getMutipleCards);

export default router;