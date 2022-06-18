export default class Candidate {
    candidate: string;
    sdpMLineIndex: number;
    sdpMid: string;
    dateTime: number;

    constructor(candidate: string, sdpMLineIndex: number, sdpMid: string, dateTime: number) {
        this.candidate = candidate;
        this.sdpMLineIndex = sdpMLineIndex;
        this.sdpMid = sdpMid;
        this.dateTime = dateTime;
    }
}
