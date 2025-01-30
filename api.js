const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const app = express();
const port = 8080;

// Load cities data
let citiesData;

async function loadCitiesData() {
    citiesData = await fs.readJSON('./addresses.json');
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== 'bearer dGhlc2VjcmV0dG9rZW4=') {
        return res.sendStatus(401);
    }
    next();
};

// Cities by tag endpoint
app.get('/cities-by-tag', authenticateToken, (req, res) => {
    const { tag, isActive } = req.query;
    const filteredCities = citiesData.filter(city => {
        const tagMatch = city.tags.includes(tag);
        const activeMatch = city.isActive === Boolean(isActive);
        return tagMatch && activeMatch;
    });
    res.json({ cities: filteredCities });
});

// Start server
async function startServer() {
    await loadCitiesData();
    app.listen(port, () => {
        console.log(`API server running on port ${port}`);
    });
}

startServer().catch(console.error);
