let cachedToken = null;
let tokenExpiry = 0;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function acquireToken() {
    // If token is still fresh, return it
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    try {
        console.log('Mountain Handshake: Acquiring fresh token from Big Bear...');
        const res = await fetch('https://www.bigbearmountainresort.com/mountain-information', {
            headers: { 'User-Agent': USER_AGENT }
        });
        if (!res.ok) throw new Error(`Handshake failed with status: ${res.status}`);

        const html = await res.text();

        // Strategy 1: Look for the token in the HTML directly (often in script tags)
        // Correct token found in research: 5pGMqUcRBEG4kmDJyHBPJA9kcynwUrQoGKDxlOLfVdQ
        const tokenRegex = /bearer_token=([a-zA-Z0-9_-]{32,})/;
        const match = html.match(tokenRegex);

        if (match && match[1]) {
            cachedToken = match[1];
            tokenExpiry = Date.now() + 1000 * 60 * 60; // Cache for 1 hour
            console.log('Mountain Handshake: Token acquired successfully.');
            return cachedToken;
        }

        // Strategy 2: Look for script tags that might contain the token
        const scriptUrls = html.match(/src="([^"]+\/static\/js\/main\.[^"]+\.js)"/g) || [];
        for (const urlMatch of scriptUrls) {
            const scriptUrl = urlMatch.match(/src="([^"]+)"/)[1];
            const fullUrl = scriptUrl.startsWith('http') ? scriptUrl : `https://www.bigbearmountainresort.com${scriptUrl}`;

            const scriptRes = await fetch(fullUrl, { headers: { 'User-Agent': USER_AGENT } });
            if (scriptRes.ok) {
                const scriptText = await scriptRes.text();
                const scriptMatch = scriptText.match(/bearer_token[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/);
                if (scriptMatch && scriptMatch[1]) {
                    cachedToken = scriptMatch[1];
                    tokenExpiry = Date.now() + 1000 * 60 * 60;
                    console.log('Mountain Handshake: Token found in bundle.');
                    return cachedToken;
                }
            }
        }

        // Fallback to the last known static token if handshake fails
        console.warn('Mountain Handshake: Handshake failed to find new token, using fallback.');
        return '5pGMqUcRBEG4kmDJyHBPJA9kcynwUrQoGKDxlOLfVdQ';
    } catch (e) {
        console.error('Mountain Handshake Error:', e);
        return '5pGMqUcRBEG4kmDJyHBPJA9kcynwUrQoGKDxlOLfVdQ';
    }
}

export async function fetchFromApi(resortIds) {
    const token = await acquireToken();
    const ids = Array.isArray(resortIds) ? resortIds : [resortIds];
    const idQuery = ids.map(id => `resortId[]=${id}`).join('&');
    const url = `https://mtnpowder.com/feed/v3.json?bearer_token=${token}&${idQuery}`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
                'Referer': 'https://www.bigbearmountainresort.com/'
            }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error('MtnPowder API fail:', e);
        return null;
    }
}

export function parseResortData(data, resortId) {
    if (!data || !data[resortId]) return null;

    const resortData = data[resortId];
    const sr = resortData.SnowReport;

    if (!sr) return null;

    return {
        lifts: {
            open: sr.TotalOpenLifts || 0,
            total: sr.TotalLifts || 0
        },
        trails: {
            open: sr.TotalOpenTrails || 0,
            total: sr.TotalTrails || 0
        },
        groomed: sr.GroomedTrails || 0,
        acres: {
            open: parseInt(sr.OpenTerrainAcres || 0),
            total: parseInt(sr.TotalTerrainAcres || 0)
        },
        parks: {
            open: sr.TotalOpenParks || 0,
            total: sr.TotalParks || 0
        },
        baseDepth: parseInt(sr.BaseArea?.BaseIn || sr.SnowBaseRangeIn || 0)
    };
}

export default {
    api: fetchFromApi,
    parse: parseResortData
};
