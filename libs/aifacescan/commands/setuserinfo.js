/**
 * 
 * @param {Websocket} ws 
 * @param {string} name 
 * @param {number} enrollid 
 * @param {number} backupnum 
 * @param {number} admin 
 * @param {*} record 
 * @returns 
 */
function setUserinfo(ws, name, enrollid, backupnum, admin = 0, record) {

    if (!ws) {
        return Promise.reject(new Error("WebSocket is not connected."));
    }

    let setUserinfoCmd = {
        cmd: 'setuserinfo',
        name: name,
        enrollid: enrollid,
        backupnum: backupnum,
        admin: admin,
        record: record
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

            console.log('operate on  pid %s backupnum %s',msg.enrollid,msg.backupnum);
            
            if (msg?.ret === 'setuserinfo') {
                cleanup();
                resolve(msg);
            }
        }

        function errorHandler(err) {
            console.error(err);
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

        ws.send(JSON.stringify(setUserinfoCmd));
    });
};

export default setUserinfo;