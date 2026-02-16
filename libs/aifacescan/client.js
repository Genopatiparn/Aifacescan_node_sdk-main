class ClientManager {
    static instance;

    constructor() {
        if (ClientManager.instance) {
            return ClientManager.instance;
        }

        /** @type {Map<string, Client>} */
        this.clients = new Map();

        ClientManager.instance = this;
    }

    /**
     * @param {string} sn
     * @param {WebSocket} ws
     * @param {object} deviceDetails
     */
    addClient(sn, ws, deviceDetails = {}) {
        this.clients.set(sn, {
            sn,
            ws,
            deviceDetails,
            isAlive: true,
            connectedAt: new Date(),
            lastPing: Date.now(),
        });

        console.log(`✅ Client ${sn} connected`);
    }

    /**
     * @param {string} sn
     * @returns {Client | undefined}
     */
    getClient(sn) {
        return this.clients.get(sn);
    }

    getAllClients() {
        return Array.from(this.clients.values());
    }

    /**
     * @param {string} sn
     */
    deleteClient(sn) {
        const client = this.clients.get(sn);
        if (!client) return;

        try {
            client.ws?.close();
        } catch (e) { }

        this.clients.delete(sn);
        console.log(`❌ Client ${sn} disconnected`);
    }

    /**
     * @param {string} sn
     * @param {boolean} isAlive
     */
    setClientAlive(sn, isAlive) {
        const client = this.clients.get(sn);
        if (!client) return;

        client.isAlive = isAlive;
        client.lastPing = Date.now();
    }

}

export default new ClientManager();
