import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function isUrl(str) {
    return str && (str.startsWith('http://') || str.startsWith('https://'));
}

async function imageToBase64(pathOrUrl) {
    try {
        let finalUrl = pathOrUrl;
        
        // ถ้าไม่ใช่ URL เต็ม แต่มี uploads/ ให้ต่อกับ BACKEND_URL
        if (!isUrl(pathOrUrl) && pathOrUrl.includes('uploads/')) {
            const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '') || '';
            if (backendUrl) {
                const pathPart = pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl;
                finalUrl = backendUrl + pathPart;
                console.log(`[IMAGE] Converting path to URL: ${finalUrl}`);
            }
        }
        
        // ถ้าเป็น URL ให้ดาวน์โหลด
        if (isUrl(finalUrl)) {
            // ลองทั้งไม่มีนามสกุลและมีนามสกุล
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
                    return Buffer.from(response.data, 'binary').toString('base64');
                } catch (err) {
                    // ลองต่อไป
                    continue;
                }
            }
            throw new Error(`Failed to download image from any URL variant of: ${finalUrl}`);
        }
        
        // ถ้าเป็น local file
        const possibleExtensions = ['', '.jpg', '.jpeg', '.png', '.gif'];
        let filePath = null;
        
        for (const ext of possibleExtensions) {
            const testPath = pathOrUrl + ext;
            if (fs.existsSync(testPath)) {
                filePath = testPath;
                break;
            }
        }
        
        if (!filePath) {
            throw new Error(`Image file not found: ${pathOrUrl}`);
        }
        
        const imageBuffer = fs.readFileSync(filePath);
        return imageBuffer.toString('base64');
        
    } catch (error) {
        throw new Error('Failed to convert image to base64: ' + error.message);
    }
};

export default imageToBase64;