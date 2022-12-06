import cors from 'cors';
import express from 'express';
import { addOrigin, corsOptionsDelegate } from './middlewares/cors.js';
import { logger } from './middlewares/logger.js';
import { router } from './routes/card.route.js';

const app = express();
/* cors */
app.use(
  addOrigin,
  cors(corsOptionsDelegate),
);
/* logger */
app.use(logger);
/* route */
app.use('/api', router);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log("Yugioh-carder server is running at: http://%s:%s", host, port);
});