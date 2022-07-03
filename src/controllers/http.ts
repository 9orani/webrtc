import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import Offer from '../models/offer';
import Answer from '../models/answer';
import Candidate from '../models/candidate';

class Disconnection {
    id: string;
    dateTime: number;

    constructor(id: string, dateTime: number) {
        this.id = id;
        this.dateTime = dateTime;
    }
}

const TimeoutRequestedTime = 10000;

const clients: Map<string, Set<string>> = new Map<string, Set<string>>();
const lastRequestedTime: Map<string, number> = new Map<string, number>();
const connectionPair: Map<string, [string, string]> = new Map<string, [string, string]>();
const offers: Map<string, Map<string, Offer>> = new Map<string, Map<string, Offer>>();
const answers: Map<string, Map<string, Answer>> = new Map<string, Map<string, Answer>>();
const candidates: Map<string, Map<string, Candidate[]>> = new Map<string, Map<string, Candidate[]>>();

const disconnections: Map<string, Disconnection[]> = new Map<string, Disconnection[]>();

const reset = (): void => {
    clients.clear();
    connectionPair.clear();
    disconnections.clear();
};

const checkSessionId = (req: Request, res: Response, next: NextFunction): void => {
    if (req.url === '/') {
        next();
        return;
    }

    const id: string = req.header('session-id');

    if (!clients.has(id)) {
        res.sendStatus(404);
        return;
    }

    lastRequestedTime.set(id, Date.now());

    next();
};

const createSession = (req: string | Request, res: Response): void => {
    const sessionId: string = typeof req === 'string' ? req : uuid();

    clients.set(sessionId, new Set<string>());
    offers.set(sessionId, new Map<string, Offer>());
    answers.set(sessionId, new Map<string, Answer>());
    candidates.set(sessionId, new Map<string, Candidate[]>());
    disconnections.set(sessionId, []);

    res.json({ sessionId: sessionId });
};

const createConnection = (req: Request, res: Response): void => {
    const sessionId = req.header('session-id');
    const { connectionId } = req.body;

    if (connectionId === null) {
        res.status(400).send({ error: new Error('connectionId is required') });
        return;
    }

    const connectionIds = getOrCreateConnectionIds(sessionId);
    connectionIds.add(connectionId);

    res.json({ connectionId: connectionId, type: 'connect', dateTime: Date.now() });
};

const getOrCreateConnectionIds = (sessionId: string): Set<string> => {
    let connectionIds = null;

    if (!clients.has(sessionId)) {
        connectionIds = new Set<string>();
        clients.set(sessionId, connectionIds);
    }
    connectionIds = clients.get(sessionId);

    return connectionIds;
};

const getConnection = (req: Request, res: Response): void => {
    const sessionId: string = req.header('session-id');
    const connections: string[] = _getConnection(sessionId);

    res.json({ connections: connections.map((v) => ({ connectionId: v, type: 'connect', dateTime: Date.now() })) });
};

const _getConnection = (sessionId: string): string[] => {
    _checkDeletedSession(sessionId);
    return Array.from(clients.get(sessionId));
};

const _checkDeletedSession = (sessionId: string): void => {
    const connectionIds = Array.from(clients.get(sessionId));
    for (const connectionId of connectionIds) {
        const pair = connectionPair.get(connectionId);
        if (pair == null) {
            continue;
        }

        const otherSessionId = sessionId === pair[0] ? pair[1] : pair[0];

        if (!lastRequestedTime.has(otherSessionId)) {
            continue;
        }

        if (lastRequestedTime.get(otherSessionId) > Date.now() - TimeoutRequestedTime) {
            continue;
        }

        _deleteSession(otherSessionId);
    }
};

const _deleteSession = (sessionId: string): void => {
    for (const connectionId of Array.from(clients.get(sessionId))) {
        _deleteConnection(sessionId, connectionId);
    }

    offers.delete(sessionId);
    answers.delete(sessionId);
    clients.delete(sessionId);
    disconnections.delete(sessionId);
};

const _deleteConnection = (sessionId: string, connectionId: string): void => {
    clients.get(sessionId).delete(sessionId);

    if (connectionPair.has(connectionId)) {
        const pair = connectionPair.get(connectionId);
        const otherSessionId = pair[0] === sessionId ? pair[1] : pair[0];

        if (otherSessionId) {
            if (clients.has(otherSessionId)) {
                clients.get(otherSessionId).delete(connectionId);
            }
        }
    }

    connectionPair.delete(connectionId);
    offers.get(sessionId).delete(connectionId);
    answers.get(sessionId).delete(connectionId);
    candidates.get(sessionId).delete(connectionId);
};

// offer 생성
const postOffer = (req: Request, res: Response): void => {
    const sessionId: string = req.header('session-id');
    const { connectionId } = req.body;

    connectionPair.set(connectionId, [sessionId, null]);

    const map = offers.get(sessionId);
    map.set(connectionId, new Offer(req.body.sdp, Date.now(), false));

    res.sendStatus(200);
};

// offer 조회
const getOffer = (req: Request, res: Response): void => {
    const fromTime: number = req.query.fromTime ? Number(req.query.fromTime) : 0;
    const sessionId: string = req.header('session-id');
    const offers: [string, Offer][] = _getOffer(sessionId, fromTime);

    res.json({ offers: offers.map((v) => ({ connectionId: v[0], sdp: v[1].sdp, polite: v[1].polite, type: 'offer', dateTime: v[1].dateTime })) });
};

const _getOffer = (sessionId: string, fromTime: number): [string, Offer][] => {
    let arrayOffers: [string, Offer][] = [];

    if (offers.size !== 0) {
        const otherSessionMap = Array.from(offers).filter((x) => x[0] != sessionId);
        arrayOffers = [].concat(...Array.from(otherSessionMap, (x) => Array.from(x[1], (y) => [y[0], y[1]])));
    }

    if (fromTime > 0) {
        arrayOffers = arrayOffers.filter((v) => v[1].dateTime > fromTime);
    }

    return arrayOffers;
};

export { reset, checkSessionId, createSession, createConnection, getConnection, postOffer, getOffer };
