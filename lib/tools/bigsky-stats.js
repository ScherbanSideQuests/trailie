import Debug from 'debug';

const debug = Debug('liftie:stats:bigsky');

const API_URL = 'https://www.bigskyresort.com/api/reportpal?resortName=bs&useReportPal=true';

/**
 * Big Sky stats fetcher. Uses the reportpal API which returns
 * resortwide summary data for trails, lifts, groomed, and snow conditions.
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
            debug('big-sky %s returned %d', API_URL, res.status);
            return null;
        }
        const data = await res.json();
        return parseData(data);
    } catch (e) {
        debug('big-sky stats error: %s', e.message);
        return null;
    }
}

/**
 * Parse the Big Sky reportpal response into our standard stats shape.
 * Exported separately for unit testing.
 */
export function parseData(data) {
    const rw = data?.currentConditions?.resortwide;
    if (!rw) return null;

    const trailsOpen = rw.numTrailsOpen ?? 0;
    const trailsTotal = rw.numTrailsTotal ?? 0;
    const liftsOpen = rw.numLiftsOpen ?? 0;
    const liftsTotal = rw.numLiftsTotal ?? 0;
    const groomed = rw.numTrailsGroomed ?? 0;

    // Base depth from resort locations
    let baseDepth = 0;
    const locations = data?.currentConditions?.resortLocations?.location;
    if (Array.isArray(locations)) {
        for (const loc of locations) {
            const inches = parseInt(String(loc?.base?.inches));
            if (!isNaN(inches) && inches > 0) {
                baseDepth = inches;
                break;
            }
        }
    }

    if (trailsTotal === 0 && liftsTotal === 0) return null;

    const result = {
        lifts: { open: liftsOpen, total: liftsTotal },
        trails: { open: trailsOpen, total: trailsTotal },
        groomed,
        baseDepth
    };

    debug('big-sky totals: %o', result);
    return result;
}
