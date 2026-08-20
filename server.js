const http = require('http');
const url = require('url');

const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
];

const routes = {
    'GET /': (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Home page\n');
    },
    'GET /greet': (req, res, query) => {
        const name = query.name || 'stranger';
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`Hello, ${name}!\n`);
    },
    'GET /api/users': (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
    },
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const query = parsedUrl.query;

    console.log(`${req.method} ${req.url}`);

    const routeKey = `${req.method} ${path}`;
    const handler = routes[routeKey];

    if (handler) {
        handler(req, res, query);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found\n');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});