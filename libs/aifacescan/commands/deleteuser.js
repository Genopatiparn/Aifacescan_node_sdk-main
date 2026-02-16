function deleteUser(ws, enrollid, backupnum) {

    if (!ws) {
        return Promise.reject(new Error("WebSocket is not connected."));
    }

    const deleteUserCmd = {
        cmd: 'deleteuser',
        enrollid,
        backupnum
    };

    return new Promise((resolve, reject) => {

        let timeout = setTimeout(()=>{
            cleanup();
            reject('response time out');
        },5000);

        function messageHandler(data) {
            let msg;
            try {
                msg = JSON.parse(data);
            } catch (err) {
                return; // Skip if it's not valid JSON
            }

            if (msg?.ret === 'deleteuser') {
                cleanup();
                resolve(msg);
            }
        }

        function errorHandler(err) {
            cleanup();
            reject(err);
        }

        function cleanup() {
            clearTimeout(timeout);
            ws.off('message', messageHandler);
            ws.off('error', errorHandler);
        }

        ws.on('message', messageHandler);
        ws.on('error', errorHandler);

        ws.send(JSON.stringify(deleteUserCmd));
    });
};

export default deleteUser;