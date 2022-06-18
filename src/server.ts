import * as express from 'express';
import router from 'router/index';
import signaling from 'router/signaling';

export const createServer = (): express.Application => {
    const app: express.Application = express();

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(router);
    app.use('/signaling', signaling);

    return app;
};
