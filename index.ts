import { Server } from 'http';
import { createServer } from './src/server';
import * as express from 'express';
import WSSignaling from './src/websocket';

const app: express.Application = createServer();
const server: Server = app.listen(8081);

new WSSignaling(server);
console.log('start websocket signaling server 8081');
