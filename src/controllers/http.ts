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

const getAllConnections = (req: Request, res: Response): void => {
    const fromTime: number = req.query.fromTime ? Number(req.query.fromTime) : 0;
    const sessionId: string = req.header('session-id');

    const connections: string[] = _getConnection(sessionId);
    const offers: [string, Offer][] = _getOffer(sessionId, fromTime);
    const answers: [string, Answer][] = _getAnswer(sessionId, fromTime);
    const candidates: [string, Candidate][] = _getCandidate(sessionId, fromTime);
    const disconnections: Disconnection[] = _getDisconnection(sessionId, fromTime);

    let array: any[] = [];

    array = array.concat(
        connections.map((v) => ({
            connectionId: v,
            type: 'connect',
            dateTime: Date.now(),
        }))
    );

    array = array.concat(
        offers.map((v) => ({
            connectionId: v[0],
            sdp: v[1].sdp,
            polite: v[1].polite,
            type: 'offer',
            dateTime: v[1].dateTime,
        }))
    );

    array = array.concat(
        answers.map((v) => ({
            connectionId: v[0],
            sdp: v[1].sdp,
            type: 'answer',
            dateTime: v[1].dateTime,
        }))
    );

    array = array.concat(
        candidates.map((v) => ({
            connectionId: v[0],
            candidate: v[1].candidate,
            sdpMLineIndex: v[1].sdpMLineIndex,
            sdpMid: v[1].sdpMid,
            type: 'candidate',
            dateTime: v[1].dateTime,
        }))
    );

    array = array.concat(
        disconnections.map((v) => ({
            connectionId: v.id,
            type: 'disconnect',
            dateTime: v.dateTime,
        }))
    );

    array.sort((a, b) => a.dateTime - b.dateTime);

    res.json({ messages: array });
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

const _getDisconnection = (sessionId: string, fromTime: number): Disconnection[] => {
    _checkDeletedSession(sessionId);

    let arrayDisconnections: Disconnection[] = [];
    if (disconnections.size !== 0 && disconnections.has(sessionId)) {
        arrayDisconnections = disconnections.get(sessionId);
    }

    if (fromTime > 0) {
        arrayDisconnections = arrayDisconnections.filter((v) => v.dateTime > fromTime);
    }

    return arrayDisconnections;
};

// answer 생성
const postAnswer = (req: Request, res: Response): void => {
    const sessionId: string = req.header('session-id');
    const { connectionId } = req.body;
    const connectionIds: Set<string> = getOrCreateConnectionIds(sessionId);

    connectionIds.add(connectionId);

    if (!connectionPair.has(connectionId)) {
        res.sendStatus(200);
        return;
    }

    const pair: [string, string] = connectionPair.get(connectionId);
    const otherSessionIds: string = pair[0] == sessionId ? pair[1] : pair[0];

    if (!clients.has(otherSessionIds)) {
        res.sendStatus(200);
        return;
    }

    const map: Map<string, Answer> = answers.get(otherSessionIds);
    map.set(connectionId, new Answer(req.body.sdp, Date.now()));

    const mapCandidates: Map<string, Candidate[]> = candidates.get(otherSessionIds);
    if (mapCandidates) {
        const arrayCandidates = mapCandidates.get(connectionId);
        if (arrayCandidates) {
            for (const candidate of arrayCandidates) {
                candidate.dateTime = Date.now();
            }
        }
    }

    res.sendStatus(200);
};

// answer 조회
const getAnswer = (req: Request, res: Response): void => {
    const fromTime: number = req.query.fromTime ? Number(req.query.fromTime) : 0;
    const sessionId: string = req.header('session-id');
    const answers: [string, Answer][] = _getAnswer(sessionId, fromTime);

    res.json({ answers: answers.map((v) => ({ connectionId: v[0], sdp: v[1].sdp, type: 'answer', dateTime: v[1].dateTime })) });
};

const _getAnswer = (sessionId: string, fromTime: number): [string, Answer][] => {
    let arrayAnswers: [string, Answer][] = [];

    if (answers.size != 0 && answers.has(sessionId)) {
        arrayAnswers = Array.from(answers.get(sessionId));
    }

    if (fromTime > 0) {
        arrayAnswers = arrayAnswers.filter((v) => v[1].dateTime > fromTime);
    }

    return arrayAnswers;
};

// candidate 생성
const postCandidate = (req: Request, res: Response): void => {
    const sessionId: string = req.header('session-id');
    const { connectionId } = req.body;

    const map = candidates.get(sessionId);
    if (!map.has(connectionId)) {
        map.set(connectionId, []);
    }

    const arr = map.get(connectionId);
    const candidate = new Candidate(req.body.candidate, req.body.sdpMLineIndex, req.body.sdpMid, Date.now());

    arr.push(candidate);
    res.sendStatus(200);
};

// candidate 조회
const getCandidate = (req: Request, res: Response): void => {
    const fromTime: number = req.query.fromTime ? Number(req.query.fromTime) : 0;
    const sessionId: string = req.header('session-id');
    const candidates: [string, Candidate][] = _getCandidate(sessionId, fromTime);

    res.json({
        candidates: candidates.map((v) => ({
            connectionId: v[0],
            candidate: v[1].candidate,
            sdpMLineIndex: v[1].sdpMLineIndex,
            sdpMid: v[1].sdpMid,
            type: 'candidate',
            dateTime: v[1].dateTime,
        })),
    });
};

const _getCandidate = (sessionId: string, fromTime: number): [string, Candidate][] => {
    const connectionIds: string[] = Array.from(clients.get(sessionId));
    const arrayCandidates: [string, Candidate][] = [];

    for (const connectionId of connectionIds) {
        const pair = connectionPair.get(connectionId);
        if (pair == null) {
            continue;
        }

        const otherSessionId: string = sessionId === pair[0] ? pair[1] : pair[0];
        if (!candidates.get(otherSessionId) || !candidates.get(otherSessionId).get(connectionId)) {
            continue;
        }

        const tmpArrayCandidates = candidates
            .get(otherSessionId)
            .get(connectionId)
            .filter((v) => v.dateTime > fromTime);
        if (tmpArrayCandidates.length === 0) {
            continue;
        }

        for (const candidate of tmpArrayCandidates) {
            arrayCandidates.push([connectionId, candidate]);
        }
    }

    return arrayCandidates;
};

export {
    reset,
    checkSessionId,
    createSession,
    createConnection,
    getConnection,
    getAllConnections,
    postOffer,
    getOffer,
    postAnswer,
    getAnswer,
    postCandidate,
    getCandidate,
};
