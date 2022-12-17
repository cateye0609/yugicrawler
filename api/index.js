import cors from 'cors';
import express from 'express';
import { addOrigin, corsOptionsDelegate } from './middlewares/cors.js';
import errorHandler from './middlewares/error.js';
import logger from './middlewares/logger.js';
import router from './routes/card.route.js';

const app = express();
/* json parser */
app.use(express.json());
/* cors */
app.use(
  addOrigin,
  cors(corsOptionsDelegate),
);
/* logger */
app.use(logger);
/* route */
app.use('/api', router);
/* error handler */
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log("Yugimaker server is running at: http://%s:%s", host, port);
});