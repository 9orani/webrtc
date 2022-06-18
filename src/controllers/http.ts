import { Request, Response, NextFunction } from 'express';
// import { v4 as uuid } from 'uuid';

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

const disconnections: Map<string, Disconnection[]> = new Map<string, Disconnection[]>();

const reset = (): void => {
    clients.clear();
    connectionPair.clear();
    disconnections.clear();
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

export { reset, checkSessionId };
