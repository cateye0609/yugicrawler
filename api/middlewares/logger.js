export const logger = (req, _res, next) => {
    const currentDate = new Date().toLocaleString();
    console.log(`[${req.method}] ${req.originalUrl} | ${currentDate}`);
    next();
};