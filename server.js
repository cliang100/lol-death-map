const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const query = parsedUrl.query;

    console.log(`${req.method} ${req.url}`);

    if (path === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Home page\n');
    } else if (path === '/greet') {
        const name = query.name || 'stranger';
        res.writeHead(200, { 'Content-Type': 'text/plain'});
        res.end(`Hello, ${name}!\n`);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain'});
        res.end('Not found\n');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});