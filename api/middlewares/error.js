import statusMsg from "../constants/message.js";
import { environment } from "../utils/utils.js";

const errorHandler = (err, _req, res, _next) => {
    const errStatus = err.statusCode || 500;
    const errMsg = err.message || statusMsg.default;
    if (environment === 'development') {
        console.error(err.stack);
    }
    res.statusMessage = errMsg;
    res.status(errStatus).json({
        status: errStatus,
        message: errMsg,
    });
}

export default errorHandler;