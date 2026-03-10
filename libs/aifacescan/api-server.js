import http from 'http';
import fs from 'fs';
import path from 'path';

function startApiServer(port = 3001) {
    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // GET /attendance/:filename - ดึงรูปภาพ
        if (req.url.startsWith('/attendance/') && req.method === 'GET') {
            try {
                const filename = req.url.split('/attendance/')[1];
                const filepath = path.join('./uploads/attendance', filename);

                if (!fs.existsSync(filepath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Image not found' }));
                    return;
                }

                const stat = fs.statSync(filepath);
                const fileStream = fs.createReadStream(filepath);

                res.writeHead(200, {
                    'Content-Type': 'image/jpeg',
                    'Content-Length': stat.size
                });

                fileStream.pipe(res);
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(port, () => {});

    return server;
}

export default startApiServer;
