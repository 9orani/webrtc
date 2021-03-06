import WS from 'jest-websocket-mock';

import Offer from '../src/models/offer';
import Answer from '../src/models/answer';
import Candidate from '../src/models/candidate';

import * as websocket from '../src/controllers/websocket';

Date.now = jest.fn(() => 1482363367071);

describe('websocket signaling test in public mode', () => {
    let server: WS;
    let client: WebSocket;
    let client2: WebSocket;

    const connectionId = 'hello world';
    const connectionId2 = 'hello world 2';

    const testSDP = 'hello sdp';

    const host = 'ws://localhost:8080';

    beforeAll(async () => {
        server = new WS(host, { jsonProtocol: true });
        client = new WebSocket(host);
        await server.connected;

        client2 = new WebSocket(host);
        await server.connected;
    });

    afterAll(() => {
        WS.clean();
    });

    test('create session 1', () => {
        expect(client).not.toBeNull();
        websocket.add(client);
    });

    test('create session 2', () => {
        expect(client2).not.toBeNull();
        websocket.add(client2);
    });

    test('create connection from session 1', async () => {
        websocket.onConnect(client, connectionId);

        await expect(server).toReceiveMessage({ type: 'connect', connectionId: connectionId, polite: true });
        expect(server).toHaveReceivedMessages([{ type: 'connect', connectionId: connectionId, polite: true }]);
    });

    test('create connection from session 2', async () => {
        websocket.onConnect(client2, connectionId2);

        await expect(server).toReceiveMessage({ type: 'connect', connectionId: connectionId2, polite: true });
        expect(server).toHaveReceivedMessages([{ type: 'connect', connectionId: connectionId2, polite: true }]);
    });

    test('send offer from session 1', async () => {
        const receiveOffer = new Offer(testSDP, Date.now(), false);
        websocket.onOffer(client, { connectionId: connectionId, sdp: testSDP });

        await expect(server).toReceiveMessage({ from: connectionId, to: '', type: 'offer', data: receiveOffer });
        expect(server).toHaveReceivedMessages([{ from: connectionId, to: '', type: 'offer', data: receiveOffer }]);
    });

    test('send answer from session 2', async () => {
        const receiveAnswer = new Answer(testSDP, Date.now());

        websocket.onAnswer(client2, { connectionId: connectionId, sdp: testSDP });

        await expect(server).toReceiveMessage({ from: connectionId, to: '', type: 'answer', data: receiveAnswer });
        expect(server).toHaveReceivedMessages([{ from: connectionId, to: '', type: 'answer', data: receiveAnswer }]);
    });

    test('send candidate from session 1', async () => {
        const msg = { connectionId: connectionId, candidate: 'hello candidate', sdpMLineIndex: 0, sdpMid: '0' };
        const receviceCandidate: Candidate = new Candidate('hello candidate', 0, '0', Date.now());

        websocket.onCandidate(client, msg);

        await expect(server).toReceiveMessage({ from: connectionId, to: '', type: 'candidate', data: receviceCandidate });
        expect(server).toHaveReceivedMessages([{ from: connectionId, to: '', type: 'candidate', data: receviceCandidate }]);
    });

    test('delete connection from session 2', async () => {
        websocket.onDisconnect(client2, connectionId);

        await expect(server).toReceiveMessage({ type: 'disconnect', connectionId: connectionId });
        expect(server).toHaveReceivedMessages([
            { type: 'disconnect', connectionId: connectionId },
            { type: 'disconnect', connectionId: connectionId },
        ]);
    });

    test('delete session 2', () => {
        expect(client).not.toBeNull();
        websocket.remove(client2);
    });

    test('delete session 1', () => {
        expect(client2).not.toBeNull();
        websocket.remove(client);
    });
});
