import { Server } from 'http';
import { createServer } from './src/server';
import * as express from 'express';
import WSSignaling from './src/websocket';

const port = process.env.WEBRTC_PORT;

const app: express.Application = createServer();
const server: Server = app.listen(port);

new WSSignaling(server);
console.log(`start websocket signaling server ${port}`);
