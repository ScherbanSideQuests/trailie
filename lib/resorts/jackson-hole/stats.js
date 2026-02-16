import Debug from 'debug';

const debug = Debug('liftie:stats:jackson-hole');

const API_URL = 'https://jacksonhole-prod.zaneray.com/api/all.json';

/**
 * Jackson Hole stats fetcher. Uses the Zaneray JSON API which provides
 * pre-computed summary data for trails, lifts, and snow conditions.
 */
export default async function fetchStats() {
    try {
        const res = await fetch(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)',
                'Accept': 'application/json'
            }
        });
        if (!res.ok) {
            debug('jackson-hole %s returned %d', API_URL, res.status);
            return null;
        }
        const data = await res.json();
        return parseData(data);
    } catch (e) {
        debug('jackson-hole stats error: %s', e.message);
        return null;
    }
}

/**
 * Parse the Jackson Hole API response into our standard stats shape.
 * Exported separately for unit testing.
 */
export function parseData(data) {
    const ts = data.trailStatus;
    const ls = data.liftStatus;

    const trailsOpen = ts?.openTrails ?? 0;
    const trailsTotal = ts?.totalTrails ?? 0;
    const groomed = ts?.groomedTrails ?? 0;
    const liftsOpen = ls?.openLifts ?? 0;
    const liftsTotal = ls?.totalLifts ?? 0;

    // Base depth from mid-mountain snow depth
    let baseDepth = 0;
    const depthVal = data.snow?.midMountain?.totalSnowDepth?.value;
    if (depthVal) {
        const parsed = parseInt(String(depthVal));
        if (!isNaN(parsed)) baseDepth = parsed;
    }

    if (trailsTotal === 0 && liftsTotal === 0) return null;

    const result = {
        lifts: { open: liftsOpen, total: liftsTotal },
        trails: { open: trailsOpen, total: trailsTotal },
        groomed,
        baseDepth
    };

    debug('jackson-hole totals: %o', result);
    return result;
}
