import { getMockReq, getMockRes } from '@jest-mock/express';

import * as http from '../src/controllers/http';

describe('http signaling test in public mode', () => {
    const sessionId = 'session 1';
    const sessionId2 = 'session 2';

    const connectionId = 'hello world';
    const connectionId2 = 'hello world 2';

    const { res, next, mockClear } = getMockRes();

    const req = getMockReq({ header: (): string => sessionId });
    const req2 = getMockReq({ header: (): string => sessionId2 });

    beforeAll(() => {
        http.reset();
    });

    beforeEach(() => {
        mockClear();
    });

    test('throw check has session', () => {
        http.checkSessionId(req, res, next);

        expect(res.sendStatus).toBeCalledWith(404);
        expect(next).not.toBeCalled();
    });

    test('create session', () => {
        http.createSession(sessionId, res);
        expect(res.json).toBeCalledWith({ sessionId: sessionId });
    });

    test('create session 2', () => {
        http.createSession(sessionId2, res);
        expect(res.json).toBeCalledWith({ sessionId: sessionId2 });
    });

    test('create connection from session 1', () => {
        const body = { connectionId: connectionId };
        req.body = body;

        http.createConnection(req, res);
        expect(res.json).toBeCalledWith({ connectionId: connectionId, dateTime: expect.anything(), type: 'connect' });
    });

    test('create connection from session 2', () => {
        const body = { connectionId: connectionId2 };
        req2.body = body;

        http.createConnection(req2, res);
        expect(res.json).toBeCalledWith({ connectionId: connectionId2, dateTime: expect.anything(), type: 'connect' });
    });

    test('get connection from session', () => {
        http.getConnection(req, res);
        expect(res.json).toBeCalledWith({ connections: [{ connectionId: connectionId, dateTime: expect.anything(), type: 'connect' }] });
    });

    test('get all connection from session', () => {
        http.getAllConnections(req, res);
        expect(res.json).toBeCalledWith({ messages: [{ connectionId: connectionId, dateTime: expect.anything(), type: 'connect' }] });
    });
});
