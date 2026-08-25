const express = require('express');
const { getDeathData } = require('./riotApi');

const app = express();
const PORT = 3000;

app.get('/api/deaths/:gameName/:tagLine', async(req, res) => {
    const { gameName, tagLine } = req.params;

    try {
        const deaths = await getDeathData(gameName, tagLine);
        res.json(deaths);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dath data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});