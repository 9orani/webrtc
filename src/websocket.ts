import axios from 'axios';
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

            ws.onmessage = async (event: MessageEvent) => {
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
                        this.entrance();
                        break;
                    case 'disconnect':
                        wsController.onDisconnect(ws, connectionId);
                        this.leave();
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

    async entrance() {
        await axios.post(`${process.env.SPRING_ADDRESS}/v1/rooms/port/${process.env.WEBRTC_PORT}`);
    }

    async leave() {
        await axios.delete(`${process.env.SPRING_ADDRESS}/v1/rooms/port/${process.env.WEBRTC_PORT}`);
    }
}
