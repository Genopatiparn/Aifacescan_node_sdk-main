'use strict'

import moment from 'moment'
import ClientManager from './client.js'
import fs from 'fs';

/**
 * 
 * @param {Websocket} ws 
 * @param {String} msg 
 */
async function wsMessageManager(ws, msg) {
    try {

        var time = moment().format('YYYY-MM-DD HH:mm:ss');

        let resMsg;

        if (msg.hasOwnProperty('cmd')) {

            switch (msg.cmd) {

                case 'reg':

                    console.log('device sn %s has registered', msg.sn);

                    ws.sn = msg.sn;

                    //add new session
                    ClientManager.addClient(msg.sn, ws, msg.devinfo)

                    resMsg = {
                        ret: 'reg',
                        result: true,
                        cloudtime: time,
                        nosenduser: false
                    };

                    ws.send(JSON.stringify(resMsg));

                    break;

                case 'sendlog':

                    console.log(
                        '\nreceived log:\nsn: %s time %s\n%s\r\n',
                        msg.sn,
                        time,
                        JSON.stringify(msg,null,2)
                    );

                    fs.appendFile(`./logs/sendlog-${msg.sn}.log`, JSON.stringify(msg, null, 2) + '\n', err => {
                        if (err) {
                            console.error('save sendlog error ', err);
                        }
                    });

                    // บันทึก attendance ลง database
                    const logs = msg.data || msg.record || [];
                    if (logs.length > 0) {
                        for (const record of logs) {
                            try {
                                let image_url = "";

                                if (record.image) {
                                    try {
                                        const timestamp = moment(record.time).format('YYYYMMDDHHmmss');
                                        const filename = `${record.enrollid}_${timestamp}.jpg`;
                                        const imageBuffer = Buffer.from(record.image, 'base64');

                                        if (process.env.UPLOAD_ATTENDANCE_TO_SERVER === 'true' && process.env.BACKEND_URL) {
                                            try {
                                                const axios = (await import('axios')).default;
                                                const FormData = (await import('form-data')).default;
                                                
                                                const formData = new FormData();
                                                formData.append('file', imageBuffer, filename);
                                                formData.append('enrollid', record.enrollid);
                                                formData.append('timestamp', timestamp);
                                                
                                                const uploadUrl = `${process.env.BACKEND_URL}/api/upload-attendance`;
                                                const response = await axios.post(uploadUrl, formData, {
                                                    headers: formData.getHeaders(),
                                                    timeout: 10000
                                                });
                                                
                                                if (response.data && response.data.url) {
                                                    image_url = response.data.url;
                                                    // แก้ไข URL ถ้าไม่มี /facetime_v2
                                                    if (!image_url.includes('/facetime_v2/') && image_url.includes('/uploads/')) {
                                                        image_url = image_url.replace('/uploads/', '/facetime_v2/uploads/');
                                                    }
                                                    console.log(`Uploaded to server: ${image_url}`);
                                                }
                                            } catch (uploadError) {
                                                console.error('Upload to server failed:', uploadError.message);
                                            }
                                        }
                                    } catch (imgError) {
                                        console.error('Error saving image:', imgError.message);
                                    }
                                }

                                // บันทึกลง database
                                try {
                                    const { isDatabaseConnected } = await import('./database.js');
                                    const { Attendance, Device } = await import('./models.js');
                                    
                                    if (isDatabaseConnected()) {
                                        // ดึง gate_type จาก device
                                        let gate_type = 'in-out';
                                        try {
                                            const device = await Device.findOne({ sn: msg.sn });
                                            if (device && device.gate_type) {
                                                gate_type = device.gate_type;
                                            }
                                        } catch (err) {
                                            console.log('Device not found, using default gate_type');
                                        }

                                        await Attendance.create({
                                            enrollid: record.enrollid || 0,
                                            sn: msg.sn,
                                            timestamp: new Date(record.time || Date.now()),
                                            image_url: image_url,
                                            gate_type: gate_type
                                        });
                                        console.log(`Saved to DB: enrollid ${record.enrollid}, gate_type: ${gate_type}`);
                                    }
                                } catch (dbError) {
                                    console.error('DB error:', dbError.message);
                                }
                            } catch (error) {
                                console.error('Error:', error.message);
                            }
                        }
                    }

                    resMsg = {
                        ret: 'sendlog',
                        result: true,
                        count: msg.count,
                        logindex: msg.logindex,
                        cloudtime: time,
                    };

                    ws.send(JSON.stringify(resMsg));

                    break;

                case 'senduser':

                    fs.appendFile(`./logs/senduser-${msg.sn}.log`, JSON.stringify(msg, null, 2) + '\n', err => {
                        if (err) {
                            console.error('save senduser error', err);
                        }
                    });

                    resMsg = {
                        ret: 'senduser',
                        result: true,
                        cloudtime: time
                    }

                    ws.send(JSON.stringify(resMsg));

                    break;

                default:
                    break;
            }
        }

        if (msg.hasOwnProperty('ret')) {

            // Handle messages returned from the terminal

            switch (msg.ret) {
                case 'getuserlist':

                    break;
                case 'getuserinfo':

                    break;
                case 'setuserinfo':

                    break;
                case 'deleteuser':

                    break;
                case 'getusername':

                    break;
                case 'setusername':

                    break;
                case 'enableuser':

                    break;
                case 'cleanuser':

                    break;
                case 'getnewlog':

                    break;
                case 'getalllog':

                    break;
                case 'cleanlog':

                    break;
                case 'initsys':

                    break;
                case 'reboot':

                    break;
                default:
                    break;
            }

        }

    } catch (error) {
        throw error;
    }

};

export default wsMessageManager;