'use strict'

import moment from 'moment'
import ClientManager from './client.js'

import fs from 'fs';

/**
 * 
 * @param {Websocket} ws 
 * @param {String} msg 
 */
function wsMessageManager(ws, msg) {
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