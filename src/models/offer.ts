export default class Offer {
    sdp: string;
    dateTime: number;
    polite: boolean;

    constructor(sdp: string, dateTime: number, polite: boolean) {
        this.sdp = sdp;
        this.dateTime = dateTime;
        this.polite = polite;
    }
}
