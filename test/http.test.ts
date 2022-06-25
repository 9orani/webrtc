import { getMockReq, getMockRes } from '@jest-mock/express';

import * as http from '../src/controllers/http';

describe('http signaling test in public mode', () => {
    const sessionId = 'session 1';
    const sessionId2 = 'session 2';

    const { res, next, mockClear } = getMockRes();

    const req = getMockReq({ header: (): string => sessionId });

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
});
