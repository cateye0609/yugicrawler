const allowOrigins = ['http://localhost:3000', 'https://yugioh-carder.vercel.app'];
export const corsOptionsDelegate = (req, callback) => {
    var corsOptions;
    if (allowOrigins.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
    } else {
        corsOptions = { origin: false } // disable CORS for this request
    }
    callback(null, corsOptions); // callback expects two parameters: error and options
}
export const addOrigin = (req, res, next) => {
    const origin = req.headers.origin;
    if (allowOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return next();
};