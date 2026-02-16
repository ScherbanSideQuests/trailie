import Debug from 'debug';

const debug = Debug('liftie:stats:snowmass');

const MOUNTAINS = ['Snowmass', 'AspenMountain', 'AspenHighlands', 'Buttermilk'];
const BASE_URL = 'https://www.aspensnowmass.com/AspenSnowmass/SnowReport/Feed?mountain=';

/**
 * Aspen Snowmass stats fetcher. Aggregates data from all 4 mountains
 * via the SnowReport/Feed API.
 */
export default async function fetchStats() {
    try {
        const results = await Promise.all(
            MOUNTAINS.map(async (mtn) => {
                const res = await fetch(`${BASE_URL}${mtn}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)',
                        'Accept': 'application/json'
                    }
                });
                if (!res.ok) {
                    debug('%s returned %d', mtn, res.status);
                    return null;
                }
                return res.json();
            })
        );

        let liftsOpen = 0, liftsTotal = 0;
        let trailsOpen = 0, trailsTotal = 0;
        let maxBase = 0;

        for (let i = 0; i < MOUNTAINS.length; i++) {
            const data = results[i];
            if (!data) continue;

            const lo = data.lifts?.openCount || parseInt(data.lifts?.open) || 0;
            const lt = data.lifts?.totalCount || parseInt(data.lifts?.total) || 0;
            const to = data.trails?.openCount || parseInt(data.trails?.open) || 0;
            const tt = data.trails?.totalCount || parseInt(data.trails?.total) || 0;
            const base = parseInt(data.snowBase?.inches) || 0;

            liftsOpen += lo;
            liftsTotal += lt;
            trailsOpen += to;
            trailsTotal += tt;
            if (base > maxBase) maxBase = base;

            debug('%s: trails=%d/%d lifts=%d/%d base=%d',
                MOUNTAINS[i], to, tt, lo, lt, base);
        }

        if (trailsTotal === 0 && liftsTotal === 0) return null;

        const result = {
            lifts: { open: liftsOpen, total: liftsTotal },
            trails: { open: trailsOpen, total: trailsTotal },
            groomed: 0,
            baseDepth: maxBase
        };

        debug('snowmass totals: %o', result);
        return result;
    } catch (e) {
        debug('snowmass stats error: %s', e.message);
        return null;
    }
}
