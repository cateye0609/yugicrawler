import { NextFunction, Request, Response } from "express";

const logger = (req: Request, _res: Response, next: NextFunction) => {
    const currentDate = new Date().toLocaleString();
    console.log(`[${req.method}] ${req.originalUrl} | ${currentDate}`);
    next();
};

export default logger;