import { Message } from "./parse_message";

/**
 * A helper class to handle capabilities sent by the IRCd.
 */
export class IrcCapabilities {
    private serverCapabilites: Map<string, string> = new Map();
    private userCapabilites: Set<string> = new Set();
    private ready = false;

    constructor(
        private readonly onCapsList: () => void,
        private readonly onCapsConfirmed: () => void) {

    }

    public isCapEnabled(cap: string): boolean {
        if (!this.ready) {
            throw Error('Server caps response has not arrived yet');
        }
        return this.userCapabilites.has(cap);
    }

    public getServerCap(cap: string): string|undefined {
        if (!this.ready) {
            throw Error('Server caps response has not arrived yet');
        }
        return this.serverCapabilites.get(cap);
    }

    /**
     * Check if the IRCD supports a given Sasl method.
     * @param method The method of SASL (e.g. 'PLAIN', 'EXTERNAL') to check support for. Case insensitive.
     * @param allowNoMethods Not all implementations support explicitly mentioning SASL methods,
     * so optionally we can return true here.
     * @returns True if supported, false otherwise.
     * @throws If the capabilites have not returned yet.
     */
    public supportsSaslMethod(method: string, allowNoMethods=false): boolean {
        if (!this.ready) {
            throw Error('Server caps response has not arrived yet');
        }
        const saslString = this.serverCapabilites.get('sasl');
        if (saslString === undefined) {
            return false;
        }
        if (saslString === '') {
            return allowNoMethods;
        }
        const saslTypes = saslString.split(',');
        return saslTypes.includes(method.toLowerCase());
    }

    /**
     * Handle an incoming `CAP` message.
     */
    public onCap(message: Message) {
        // E.g. CAP * LS :account-notify away-notify chghost extended-join multi-prefix
        // sasl=PLAIN,ECDSA-NIST256P-CHALLENGE,EXTERNAL tls account-tag cap-notify echo-message
        // solanum.chat/identify-msg solanum.chat/realhost
        if (message.args[1] === 'LS') {
            const capsGiven = message.args.slice(-1);
            if (capsGiven) {
                const capArray = capsGiven[0].split(' ');
                capArray.forEach(cap => {
                    const firstEqualSign = cap.indexOf('=');
                    if (firstEqualSign === -1) {
                        this.serverCapabilites.set(cap, '');
                    }
                    else {
                        const key = cap.substring(0, firstEqualSign);
                        // Normalize this to lowercase to avoid casing problems between ircds
                        const value = cap.substring(firstEqualSign+1).toLowerCase();
                        this.serverCapabilites.set(key, value);
                    }
                })
            }
            // * as the penultimate parameter means there's more caps coming, so we wait to
            // send the caps back until it's complete.
            if (message.args.slice(-2, -1)[0] !== '*') {
                this.ready = true;
                this.onCapsList();
            }
        }
        else if (message.args[1] === 'ACK') {
            const capsGiven = message.args.slice(-1);
            if (capsGiven) {
                const acceptedCaps = capsGiven[0].split(' ');
                acceptedCaps.forEach(cap => this.userCapabilites.add(cap));
            }
            this.onCapsConfirmed();
        }
    }
}
