import startServer from "./libs/aifacescan/server.js";
import ClientManager from "./libs/aifacescan/client.js";
import aifacescan from "./libs/aifacescan/commands/index.js";
import { BACKUP_TYPE } from "./libs/aifacescan/constant.js";
import fs from 'fs';
import imageToBase64 from "./libs/image-to-base64.js";

fs.mkdirSync('./logs', { recursive: true });

startServer(8080); //start websocket server on port 8080

async function main() {

    while (1) {
        try {

            let data = JSON.parse(fs.readFileSync('./example/person.json', 'utf-8'));
            let persons = data.filter(person => person.status === 0 || person.status === 5);

            if (persons && persons.length > 0) {

                console.log('process modeling...');

                for (let i = 0; i < persons.length; i++) {

                    let person = persons[i];

                    const device = ClientManager.getClient(person.sn);

                    if (device) {

                        if (person.status == 0) {

                            console.log('uploading person enrollid %s name %s to device %s', person.enrollid, person.name, person.sn);

                            //upload person data
                            //admin 0 normal user ,1 admin user
                            //backupnum 0~9 fingerprint 10:password 11:rfid card ,20-27 is staticface,30-37 is parlm,50 is photo

                            //upload photo
                            if (person.picture) {
                                let imageBase64 = await imageToBase64(person.picture);
                                let pictureResult = await aifacescan.setUserinfo(
                                    device.ws,
                                    person.name,
                                    person.enrollid,
                                    BACKUP_TYPE.PHOTO,
                                    person.admin,
                                    imageBase64
                                );
                                console.log('upload picture result:', pictureResult);
                            }

                            //upload password
                            if (person.password) {
                                let passwordResult = await aifacescan.setUserinfo(
                                    device.ws,
                                    person.name,
                                    person.enrollid,
                                    BACKUP_TYPE.PASSWORD,
                                    person.admin,
                                    person.password
                                );
                                console.log('upload password result:', passwordResult);
                            }

                            //upload rfid
                            if (person.rfid) {
                                let rfidResult = await aifacescan.setUserinfo(
                                    device.ws,
                                    person.name,
                                    person.enrollid,
                                    BACKUP_TYPE.RFID,
                                    person.admin,
                                    person.rfid
                                );
                                console.log('upload rfid result:', rfidResult);
                            }

                            //set person status to 1 (uploaded)
                            person.status = 1;

                            console.log('finished uploading person ', person);

                        } else if (person.status == 5) {

                            //delete person data
                            //backupnum 13 delete all data of the user
                            let deleteUserResult = await aifacescan.deleteUser(device.ws, person.enrollid, 13);
                            console.log('delete user result:', deleteUserResult);

                            if(deleteUserResult && deleteUserResult.result === true){
                                person.status = 6; //set person status to 6 (deleted)
                            }
                        }
                    }else{
                        console.log('device sn %s not connected', person.sn);
                    }
                }

                //overwrite example persons data
                fs.writeFileSync(
                    './example/person.json',
                    JSON.stringify(persons, null, 2),
                    'utf-8'
                );
            }

        } catch (error) {
            throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
};

main().catch(error => console.error(error));