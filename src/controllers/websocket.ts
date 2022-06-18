// import Offer from 'models/offer';
// import Answer from 'models/answer';
// import Candidate from 'models/candidate';

const clients: Map<WebSocket, Set<string>> = new Map<WebSocket, Set<string>>();
const connectionPair: Map<string, [WebSocket, WebSocket]> = new Map<string, [WebSocket, WebSocket]>();

const getOrCreateConnectionIds = (session: WebSocket): Set<string> => {
    let connectionIds = null;

    if (!clients.has(session)) {
        connectionIds = new Set<string>();
        clients.set(session, connectionIds);
    }
    connectionIds = clients.get(session);

    return connectionIds;
};

const add = (ws: WebSocket): void => {
    clients.set(ws, new Set<string>());
};

const remove = (ws: WebSocket): void => {
    const connectionIds = clients.get(ws);

    connectionIds.forEach((connectionId) => {
        const pair = connectionPair.get(connectionId);

        if (pair) {
            const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];

            if (otherSessionWs) {
                otherSessionWs.send(JSON.stringify({ type: 'disconnect', connectionId: connectionId }));
            }
        }
    });

    clients.delete(ws);
};

const onConnect = (ws: WebSocket, connectionId: string): void => {
    const connectionIds = getOrCreateConnectionIds(ws);
    connectionIds.add(connectionId);

    ws.send(JSON.stringify({ type: 'connect', connectionId: connectionId, polite: true }));
};

const onDisconnect = (ws: WebSocket, connectionId: string): void => {
    const connectionIds = clients.get(ws);
    connectionIds.delete(connectionId);

    if (connectionPair.has(connectionId)) {
        const pair = connectionPair.get(connectionId);
        const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];

        if (otherSessionWs) {
            otherSessionWs.send(JSON.stringify({ type: 'disconnect', connectionId: connectionId }));
        }
    }
    connectionPair.delete(connectionId);

    ws.send(JSON.stringify({ type: 'disconnect', connectionId: connectionId }));
};

export { add, remove, onConnect, onDisconnect };
