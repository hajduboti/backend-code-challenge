const express = require('express');
const fs = require('fs-extra');
const app = express();
const port = 8080;

// Preload cities data
let citiesData;

// Store for area calculation results
const areaResults = new Map();

// HELPER FUNCTIONS

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

// Calculate distance between two points using Haversine formula
// https://stackoverflow.com/questions/14560999/using-the-haversine-formula-in-javascript
function calculateDistance(lat1Deg, lon1Deg, lat2Deg, lon2Deg) {
    function toRad(degree) {
        return degree * Math.PI / 180;
    }

    const lat1 = toRad(lat1Deg);
    const lon1 = toRad(lon1Deg);
    const lat2 = toRad(lat2Deg);
    const lon2 = toRad(lon2Deg);

    const { sin, cos, sqrt, atan2 } = Math;

    const R = 6371; // earth radius in km
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = sin(dLat / 2) * sin(dLat / 2)
            + cos(lat1) * cos(lat2)
            * sin(dLon / 2) * sin(dLon / 2);
    const c = 2 * atan2(sqrt(a), sqrt(1 - a));
    const d = R * c; // distance in km
    return Number(d.toFixed(2)); // added the toFixed function to round down to 2 decimals
}


// ENDPOINTS

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

// Distance calculation endpoint
app.get('/distance', authenticateToken, (req, res) => {
    const { from, to } = req.query;
    const fromCity = citiesData.find(city => city.guid === from);
    const toCity = citiesData.find(city => city.guid === to);

    const distance = calculateDistance(
        fromCity.latitude,
        fromCity.longitude,
        toCity.latitude,
        toCity.longitude
    );

    res.json({
        from: fromCity,
        to: toCity,
        unit: 'km',
        distance
    });
});

// Area calculation endpoint
app.get('/area', authenticateToken, (req, res) => {
    const { from, distance } = req.query;
    const resultId = '2152f96f-50c7-4d76-9e18-f7033bd14428';

    setTimeout(() => {
        const fromCity = citiesData.find(city => city.guid === from);
        const citiesInRange = citiesData.filter(city => {
            if (city.guid === fromCity.guid) return false;
            const dist = calculateDistance(
                fromCity.latitude,
                fromCity.longitude,
                city.latitude,
                city.longitude
            );
            return dist <= Number(distance);
        });
        areaResults.set(resultId, citiesInRange);
    }, 1000);

    res.status(202).json({
        resultsUrl: `http://127.0.0.1:${port}/area-result/${resultId}`
    });
});

// Area result polling endpoint
app.get('/area-result/:id', authenticateToken, (req, res) => {
    const result = areaResults.get(req.params.id);
    if (!result) {
        res.status(202).end();
    } else {
        res.json({ cities: result });
    }
});

// All cities streaming endpoint
app.get('/all-cities', authenticateToken, (req, res) => {
    const readStream = fs.createReadStream('./addresses.json');
    readStream.pipe(res);
});


// Start server
async function startServer() {
    await loadCitiesData();
    app.listen(port, () => {
        console.log(`API server running on port ${port}`);
    });
}

startServer().catch(console.error);
