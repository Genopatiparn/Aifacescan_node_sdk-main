import http from "http";
import { WebSocketServer } from "ws";
import wsMessageManager from "./ws-message-manager.js";
import ClientManager from "./client.js"

/**
 * 
 * @param {number} port 
 */
function startServer(port = 8989) {

    const server = http.createServer();

    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', function connection(ws, req) {

        const ip = req.socket.remoteAddress.split(":")[3];
        ws.ip = ip;
        ws.isAlive = true;
        console.log('device ip %s connected', ip);

        ws.on('error', console.error);

        ws.on('message', function message(data) {

            try {

                let msg = JSON.parse(data.toString("utf-8"));
                if (msg.hasOwnProperty('cmd')) {
                    ws.sn = msg.sn;
                    wsMessageManager(ws, msg);
                }

            } catch (error) {
                console.error(error);
            }
        });

        ws.on('close', function close() {
            console.log('device ip %s sn %s disconnected', ws.ip, ws.sn);
            if(ws.sn){
                ClientManager.deleteClient(ws.sn)
            }
        })

        ws.on("pong", heartbeat);

    });

    // heartbeat
    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {

            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping();

        });
    }, 5000);

    wss.on('close', function close() {
        clearInterval(interval);
    });

    server.on('upgrade', function (request, socket, head) {
        
        const pathname = request.url;
      
        if (pathname === '/pub/chat') {
            wss.handleUpgrade(request, socket, head, function done(ws) {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.write('HTTP/1.1 400 Invalid Request\r\n\r\n');
            socket.destroy();
        }
    });

    server.listen(port, () => {});
};

function heartbeat() {

    this.isAlive = true;
    if (this.sn) {
        ClientManager.setClientAlive(this.sn, true);
    }

};

export default startServer;