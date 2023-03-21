import { NextFunction, Response } from "express";
import statusMsg from "../constants/message";
import { environment } from "../utils/utils";

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const errStatus = err.statusCode || 500;
    const errMsg = err.message || statusMsg.default;
    if (environment === 'development') {
        console.error(err.stack);
    }
    res.status(errStatus).json({
        status: errStatus,
        message: errMsg,
    });
}

export default errorHandler;