import * as express from 'express';

const router: express.Router = express.Router();

router.get('/config', (_, res) => res.json({ useWebSocket: true, startupMode: 'public', logging: 'dev' }));

export default router;
