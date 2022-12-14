import { crawlCard } from "../utils/utils.js";
import ApiError from "../utils/apiError.js";
import statusMsg from "../constants/message.js";
export const getMutipleCards = async (req, res, next) => {
    if (req.body.list && req.body.list.length) {
        const list = [...new Set(req.body.list)];
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