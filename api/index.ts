import cors from 'cors';
import express from 'express';
import { AddressInfo } from 'net';
import { addOrigin, corsOptionsDelegate } from './middlewares/cors';
import errorHandler from './middlewares/error';
import logger from './middlewares/logger';
import router from './routes/card.route';

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
  const serverAddress = server.address() as AddressInfo;
  const host = serverAddress.address;
  const port = serverAddress.port;
  console.log("Yugicrawler is running at: http://%s:%s", host, port);
});