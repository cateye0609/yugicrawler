import * as fs from 'fs';
import * as ydke from "ydke";
import statusMsg from "../constants/message.js";
import ApiError from "../utils/apiError.js";
import { crawlCard } from "../utils/utils.js";

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