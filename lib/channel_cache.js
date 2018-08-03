class Channel {
    constructor(channelName) {
        this._users = new Set();
        this.userModePrefix = [];
        this.key = channelName.toLowerCase();
        this.serverName = channelName;
        this.created = null;
        this.mode = "";
        this.topic = null;
        this.topicBy = null;
    }

    get users() {
        return this.userModePrefix;
    }

    setUserPrefix(nick, mode) {
        this.userModePrefix[nick] = mode;
    }

    clearUserPrefix(nick, mode) {
        this.userModePrefix[nick] = "";
    }

    addUserPrefix(nick, mode) {
        if (!this._users.has(nick)) {
            return;
        }
        if (!this.userModePrefix[nick].includes(mode)) {
            this.userModePrefix += mode;
        }
    }

    removeUserPrefix(nick, mode) {
        if (!this._users.has(nick)) {
            return;
        }
        this.userModePrefix[nick] = this.userModePrefix[nick].replace(mode, '');
    }

    changeUserNick(oldNick, newNick) {
        this._users.add(newNick);
        // If we didn't delete the old nick, then we don't need to change the mode.
        if (!this._users.delete(oldNick)) {
            return;
        }
        this.userModePrefix[newNick] = this.userModePrefix[oldNick];
        delete this.userModePrefix[oldNick];
    }

    userInChannel(nick) {
        return this._users.has(nick);
    }

    addUser(nick) {
        if (this._users.has(nick)) {
            return;
        }
        this._users.add(nick)
        this.userModePrefix[nick] = "";
    }

    removeUser(nick) {
        if (this._users.delete(nick)) {
            delete this.userModePrefix[nick];
            return true;
        }
        return false;
    }
}

/* A class to be shared between client instances to reduce memory footprint */
class ChannelCache {
    constructor() {
        this.channels = new Map(); /* channelname -> Channel */
        this.clientChannels = new Map(); /* client_id:Set(Channel) */
    }

    /**
     * Mark the client as joined to the channel.
     * @param {number} clientId The ID of the connection.
     * @param {string} channel The IRC channel.
     */
    markClientJoined(clientId, channel) {
        let channelSet = this.clientChannels.get(clientId);
        if (channelSet === undefined) {
            channelSet = new Set();
            this.clientChannels.set(clientId, channelSet);
        }
        if (channel !== undefined) {
            return channelSet.add(channel);
        }
        return false;
    }
    /**
     * Mark the client as left from the channel.
     * @param {number} clientId The ID of the connection.
     * @param {Channel} channel The IRC channel.
     */
    markClientLeft(clientId, channel) {
        let channelSet = this.clientChannels.get(clientId);
        if (channelSet === undefined) {
            return;
        }
        let res = channelSet.delete(channel);
        if (res && channelSet.size === 0) {
            this.clientChannels.delete(clientId);
            this.clearUnusedChannel(channel);
        }
        return res;
    }

    /**
     * Clear an unused channel from the cache
     * IF no clients are joined to it.
     * @param {Channel} channel The IRC channel.
     */
    clearUnusedChannel(channel) {
        for (const chanSet of this.clientChannels.values()) {
            if (chanSet.has(channel)){
                return;
            }
        }
        this.channels.delete(channel);
    }
    
    /**
     * Create a new Channel if it does not exist.
     * channelName is automatically lowecased.
     * @param {string} channelName 
     * @returns {Channel} Returns the created channel, or the prexisting channel.
     */
    createChannel(channelName) {
        const key = channelName.toLowerCase();
        if (this.channels.has(key)) {
            return this.channels.get(key);
        }
        const chan = new Channel(channelName);
        this.channels.set(channelName, chan);
        return chan;
    }

    getClientChannelNames(clientId) {
        if (!this.clientChannels.has(clientId)) {
            return [];
        }
        return [...this.clientChannels.get(clientId)].map((channel) => channel.key);
    }

    getClientChannels(clientId) {
        if (!this.clientChannels.has(clientId)) {
            return [];
        }
        return this.clientChannels.get(clientId);
    }

    getClientChannelsObject(clientId) {
        if (!this.clientChannels.has(clientId)) {
            return {};
        }
        const chanObj = { };
        this.clientChannels.get(clientId).forEach(
            (chanName) => {
                const channel = this.channels.get(chanName);
                chanObj[channel.key] = channel;
        });
        return chanObj;
    }

    getChannelForClient(clientId, channelName) {
        const key = channelName.toLowerCase();
        if (!this.clientChannels.has (clientId)){
            return;
        }
        return [...this.clientChannels.get(clientId)].find((chan) => chan.key === key);
    }

}

module.exports = ChannelCache;