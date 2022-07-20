import { Server } from 'http';
import * as websocket from 'ws';
import * as wsController from './controllers/websocket';

export default class WSSignaling {
    server: Server;
    ws: websocket.Server;

    constructor(server: Server) {
        this.server = server;
        this.ws = new websocket.Server({ server });

        this.ws.on('connection', (ws: WebSocket) => {
            wsController.add(ws);

            ws.onclose = (): void => {
                wsController.remove(ws);
            };

            ws.onmessage = (event: MessageEvent): void => {
                // type:            connect, disconnect JSON Schema
                // connectionId:    connect or disconnect connectionId

                // type: offer, answer, candidate JSON Schema
                // from: from connection id
                // to: to connection id
                // data: any message data structure

                const msg = JSON.parse(event.data);

                if (!msg || !this) {
                    return;
                }

                console.log(msg);

                const connectionId = msg.connectionId;

                switch (msg.type) {
                    case 'connect':
                        wsController.onConnect(ws, connectionId);
                        break;
                    case 'disconnect':
                        wsController.onDisconnect(ws, connectionId);
                        break;
                    case 'offer':
                        wsController.onOffer(ws, msg.data);
                        break;
                    case 'answer':
                        wsController.onAnswer(ws, msg.data);
                        break;
                    case 'candidate':
                        wsController.onCandidate(ws, msg.data);
                        break;
                    default:
                        break;
                }
            };
        });
    }
}
