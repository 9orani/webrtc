import * as express from 'express';
import * as http from 'controllers/http';

const router: express.Router = express.Router();

router.use(http.checkSessionId);

export default router;
