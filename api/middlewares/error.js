import statusMsg from "../constants/message.js";

const errorHandler = (err, _req, res, _next) => {
    const errStatus = err.statusCode || 500;
    const errMsg = err.message || statusMsg.default;
    const env = process.env.NODE_ENV || 'development';
    if (env === 'development') {
        console.error(err.stack);
    }
    res.status(errStatus).json({
        status: errStatus,
        message: errMsg,
    });
}

export default errorHandler;