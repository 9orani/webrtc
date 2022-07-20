import * as express from 'express';
import * as http from '../controllers/http';

const router: express.Router = express.Router();

router.use(http.checkSessionId);

router.get('', http.getAllConnections);
router.get('/connection', http.getConnection);
router.get('/offer', http.getOffer);
router.get('/answer', http.getAnswer);
router.get('/candidate', http.getCandidate);

router.post('/offer', http.postOffer);
router.post('/answer', http.postAnswer);
router.post('/candidate', http.postCandidate);

router.put('', http.createSession);
router.put('/connection', http.createConnection);

router.delete('', http.deleteSession);
router.delete('/connection', http.deleteConnection);

export default router;
