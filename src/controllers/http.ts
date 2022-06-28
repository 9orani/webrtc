import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import Offer from 'models/offer';
import Answer from 'models/answer';
import Candidate from 'models/candidate';

class Disconnection {
    id: string;
    dateTime: number;

    constructor(id: string, dateTime: number) {
        this.id = id;
        this.dateTime = dateTime;
    }
}

// const TimeoutRequestedTime = 10000;

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

export { reset, checkSessionId, createSession, createConnection };
