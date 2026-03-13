import startServer from "./libs/aifacescan/server.js";
import startApiServer from "./libs/aifacescan/api-server.js";
import ClientManager from "./libs/aifacescan/client.js";
import aifacescan from "./libs/aifacescan/commands/index.js";
import { BACKUP_TYPE } from "./libs/aifacescan/constant.js";
import fs from 'fs';
import imageToBase64 from "./libs/image-to-base64.js";
import axios from 'axios';
import dotenv from 'dotenv';
import { connectDatabase, isDatabaseConnected } from './libs/aifacescan/database.js';
import { Modeling, Employee, Device } from './libs/aifacescan/models.js';

function isUrl(path) {
    return path && (path.startsWith('http://') || path.startsWith('https://'));
}

async function downloadImageAsBase64(imageUrl) {
    try {
        let finalUrl = imageUrl;
        
        if (imageUrl.includes('uploads/') && !isUrl(imageUrl)) {
            const backendUrl = process.env.BACKEND_URL.replace(/\/$/, '');
            const pathPart = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
            finalUrl = backendUrl + pathPart;
        }
        else if (isUrl(imageUrl) && process.env.BACKEND_URL && imageUrl.includes('/uploads/')) {
            const pathPart = imageUrl.substring(imageUrl.indexOf('/uploads/'));
            const backendUrl = process.env.BACKEND_URL.replace(/\/$/, '');
            finalUrl = backendUrl + pathPart;
        }
        
        // ลองหลายนามสกุล
        const urlsToTry = [
            finalUrl,
            finalUrl + '.jpg',
            finalUrl + '.jpeg',
            finalUrl + '.png'
        ];
        
        for (const url of urlsToTry) {
            try {
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                console.log(`[IMAGE] Downloaded successfully from: ${url}`);
                return Buffer.from(response.data).toString('base64');
            } catch (err) {
                // ลองต่อไป
                continue;
            }
        }
        
        throw new Error(`Failed to download image from any URL variant of: ${finalUrl}`);
    } catch (error) {
        console.error(`Failed to download image:`, error.message);
        throw error;
    }
}
dotenv.config();

fs.mkdirSync('./logs', { recursive: true });
fs.mkdirSync('./uploads/attendance', { recursive: true });

let useDatabase = false;

if (process.env.MONGO_DATABASE) {
    try {
        await connectDatabase();
        useDatabase = true;
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

const WS_PORT = parseInt(process.env.WS_PORT) || 8080;
const API_PORT = parseInt(process.env.API_PORT) || 3001;
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL) || 5000;
const EMPLOYEE_BATCH_SIZE = parseInt(process.env.EMPLOYEE_BATCH_SIZE) || 100;
const TASK_BATCH_SIZE = parseInt(process.env.TASK_BATCH_SIZE) || 20;

startServer(WS_PORT);

startApiServer(API_PORT);

async function main() {
    while (1) {
        try {
            if (useDatabase && isDatabaseConnected()) {

                await Promise.all([
                    processFromDatabase(),
                    processFromJSON()
                ]);
            } else {
                await processFromJSON();
            }
        } catch (error) {
            console.error('Error in main loop:', error.message);
        }

        await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL));
    }
}

async function cleanupOrphanedTasks() {
    try {
        const { Employee, Modeling } = await import('./libs/aifacescan/models.js');
        
        // หา tasks ทั้งหมดที่ status 0 หรือ 4
        const tasks = await Modeling.find({ 
            status: { $in: [0, 4] } 
        }).limit(100);
        
        if (tasks.length === 0) return;
        
        let deletedCount = 0;
        
        for (const task of tasks) {
            const employee = await Employee.findOne({ enrollid: task.enrollid });
            
            // ลบถ้าไม่มี Employee หรือ status ไม่ใช่ active
            if (!employee || employee.status !== 'active') {
                await Modeling.deleteOne({ _id: task._id });
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(`Deleted ${deletedCount} orphaned task(s)`);
        }
    } catch (error) {
        console.error('[Cleanup] Error:', error.message);
    }
}

async function processFromDatabase() {
    const connectedDevices = ClientManager.getAllClients();
    
    if (connectedDevices.length === 0) {
        return;
    }

    // ทำความสะอาด tasks ที่ไม่มี Employee (ทุก 10 รอบ)
    if (!processFromDatabase.cleanupCounter) {
        processFromDatabase.cleanupCounter = 0;
    }
    processFromDatabase.cleanupCounter++;
    
    if (processFromDatabase.cleanupCounter >= 10) {
        processFromDatabase.cleanupCounter = 0;
        await cleanupOrphanedTasks();
    }

    for (const connectedDevice of connectedDevices) {
        const deviceInfo = await Device.findOne({ sn: connectedDevice.sn });
        
        if (!deviceInfo || !deviceInfo.siteid) {
            continue;
        }

        const employees = await Employee.find({
            siteid: deviceInfo.siteid,
            status: 'active'
        }).limit(EMPLOYEE_BATCH_SIZE);

        if (employees.length > 0) {
            for (const employee of employees) {
                const existingTask = await Modeling.findOne({
                    enrollid: employee.enrollid,
                    device_sn: connectedDevice.sn,
                    status: { $in: [0, 1, 4] }
                });

                if (!existingTask) {
                    const tasksToCreate = [];
                    
                    if (employee.picture) {
                        tasksToCreate.push({
                            enrollid: employee.enrollid,
                            device_sn: connectedDevice.sn,
                            status: 0,
                            type: 'fc',
                            retry_count: 0,
                            max_retries: 3,
                            processing: false
                        });
                    }
                    
                    if (employee.password) {
                        tasksToCreate.push({
                            enrollid: employee.enrollid,
                            device_sn: connectedDevice.sn,
                            status: 0,
                            type: 'pv',
                            retry_count: 0,
                            max_retries: 3,
                            processing: false
                        });
                    }
                    
                    if (employee.rfid) {
                        tasksToCreate.push({
                            enrollid: employee.enrollid,
                            device_sn: connectedDevice.sn,
                            status: 0,
                            type: 'rf',
                            retry_count: 0,
                            max_retries: 3,
                            processing: false
                        });
                    }

                    if (tasksToCreate.length > 0) {
                        await Modeling.insertMany(tasksToCreate);
                    }
                }
            }
        }
    }
    
    const connectedSNs = connectedDevices.map(c => c.sn);

    const tasks = await Modeling.find({
        device_sn: { $in: connectedSNs },
        status: { $in: [0, 4, 5] },
        $or: [
            { processing: { $exists: false } },
            { processing: false }
        ],
        $and: [
            {
                $or: [
                    { retry_count: { $exists: false } },
                    { retry_count: { $lt: 3 } }
                ]
            }
        ]
    }).limit(TASK_BATCH_SIZE);

    if (tasks.length === 0) {
        return;
    }

    for (const task of tasks) {
        const device = ClientManager.getClient(task.device_sn);
        
        if (!device) {
            continue;
        }

        await Modeling.updateOne(
            { _id: task._id },
            { processing: true, processing_at: new Date() }
        );

        try {
            const employee = await Employee.findOne({ enrollid: task.enrollid });
            
            if (!employee) {
                await Modeling.deleteOne({ _id: task._id });
                continue;
            }

            if (employee.status !== 'active') {
                await Modeling.deleteOne({ _id: task._id });
                continue;
            }

            if (task.status === 0 || task.status === 4) {

                let success = true;
                let errorMsg = '';

                if (task.type === 'fc' && employee.picture) {
                    try {
                        let imageBase64;

                        if (isUrl(employee.picture) || employee.picture.includes('uploads/')) {
                            imageBase64 = await downloadImageAsBase64(employee.picture);
                        } else {
                            imageBase64 = await imageToBase64(employee.picture);
                        }
                        
                        console.log(`Sending photo for enrollid ${employee.enrollid}, size: ${imageBase64.length} bytes`);
                        
                        let result = await aifacescan.setUserinfo(
                            device.ws,
                            employee.name,
                            employee.enrollid,
                            BACKUP_TYPE.PHOTO,
                            employee.device_admin,
                            imageBase64
                        );
                        
                        console.log(`Photo result for enrollid ${employee.enrollid}:`, JSON.stringify(result));
                        
                        if (!result || !result.result) {
                            success = false;
                            errorMsg = `Photo upload failed: ${JSON.stringify(result)}`;
                        } else {
                            console.log(` Photo uploaded successfully for enrollid ${employee.enrollid}`);
                        }
                    } catch (err) {
                        success = false;
                        errorMsg = `Photo error: ${err.message || err}`;
                        console.error(` Photo error for enrollid ${employee.enrollid}:`, err);
                    }
                }

                if (task.type === 'pv' && employee.password) {
                    try {
                        let result = await aifacescan.setUserinfo(
                            device.ws,
                            employee.name,
                            employee.enrollid,
                            BACKUP_TYPE.PASSWORD,
                            employee.device_admin,
                            employee.password
                        );
                        if (!result || !result.result) {
                            success = false;
                            errorMsg = 'Password upload failed';
                        }
                    } catch (err) {
                        success = false;
                        errorMsg = `Password error: ${err.message || err}`;
                    }
                }

                if (task.type === 'rf' && employee.rfid) {
                    try {
                        let result = await aifacescan.setUserinfo(
                            device.ws,
                            employee.name,
                            employee.enrollid,
                            BACKUP_TYPE.RFID,
                            employee.device_admin,
                            employee.rfid
                        );
                        if (!result || !result.result) {
                            success = false;
                            errorMsg = 'RFID upload failed';
                        }
                    } catch (err) {
                        success = false;
                        errorMsg = `RFID error: ${err.message || err}`;
                    }
                }

                if (success) {
                    await Modeling.updateOne(
                        { _id: task._id },
                        { status: 1, err_msg: '', processing: false, last_attempt: new Date() }
                    );
                } else {
                    const retryCount = task.retry_count + 1;
                    const newStatus = retryCount >= task.max_retries ? 4 : 4;
                    await Modeling.updateOne(
                        { _id: task._id },
                        { 
                            status: newStatus, 
                            err_msg: errorMsg, 
                            retry_count: retryCount,
                            processing: false,
                            last_attempt: new Date()
                        }
                    );
                }

            } else if (task.status === 5) {
                let result = await aifacescan.deleteUser(device.ws, task.enrollid, 13);
                
                if (result && result.result === true) {
                    await Modeling.updateOne(
                        { _id: task._id },
                        { status: 6, processing: false, last_attempt: new Date() }
                    );
                } else {
                    await Modeling.updateOne(
                        { _id: task._id },
                        { status: 4, err_msg: 'Delete failed', processing: false, last_attempt: new Date() }
                    );
                }
            }

        } catch (error) {
            console.error(`Error processing task ${task._id}:`, error.message);
            await Modeling.updateOne(
                { _id: task._id },
                { status: 4, err_msg: error.message, processing: false, last_attempt: new Date() }
            );
        }
    }
}

async function processFromJSON() {
    let data = JSON.parse(fs.readFileSync('./example/person.json', 'utf-8'));
    let persons = data.filter(person => person.status === 0 || person.status === 5);

    if (persons && persons.length > 0) {
        for (let i = 0; i < persons.length; i++) {
            let person = persons[i];
            const device = ClientManager.getClient(person.sn);

            if (device) {
                if (person.status == 0) {
                    if (person.picture) {
                        let imageBase64;

                        if (isUrl(person.picture) || person.picture.includes('uploads/')) {
                            imageBase64 = await downloadImageAsBase64(person.picture);
                        } else {
                            imageBase64 = await imageToBase64(person.picture);
                        }
                        
                        await aifacescan.setUserinfo(
                            device.ws,
                            person.name,
                            person.enrollid,
                            BACKUP_TYPE.PHOTO,
                            person.admin,
                            imageBase64
                        );
                    }

                    if (person.password) {
                        await aifacescan.setUserinfo(
                            device.ws,
                            person.name,
                            person.enrollid,
                            BACKUP_TYPE.PASSWORD,
                            person.admin,
                            person.password
                        );
                    }

                    if (person.rfid) {
                        await aifacescan.setUserinfo(
                            device.ws,
                            person.name,
                            person.enrollid,
                            BACKUP_TYPE.RFID,
                            person.admin,
                            person.rfid
                        );
                    }

                    person.status = 1;

                } else if (person.status == 5) {
                    let deleteUserResult = await aifacescan.deleteUser(device.ws, person.enrollid, 13);

                    if (deleteUserResult && deleteUserResult.result === true) {
                        person.status = 6;
                    }
                }
            }
        }

        fs.writeFileSync(
            './example/person.json',
            JSON.stringify(persons, null, 2),
            'utf-8'
        );
    }
}

main().catch(error => console.error('Unhandled error:', error));