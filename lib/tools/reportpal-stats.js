import Debug from 'debug';

const debug = Debug('liftie:stats:reportpal');

/**
 * Shared stats fetcher for Boyne resorts using the reportpal API.
 * Each resort needs a `statsUrl` in resort.json pointing to its reportpal endpoint.
 *
 * Usage from a resort's index.js:
 *   export { default as fetchStats } from '../../tools/reportpal-stats.js';
 */
export default async function fetchStats(resort) {
    const feedUrl = resort.statsUrl;
    if (!feedUrl) {
        debug('No statsUrl for %s', resort.id);
        return null;
    }

    const url = typeof feedUrl === 'string'
        ? feedUrl
        : `${feedUrl.host}${feedUrl.pathname}`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)',
                'Accept': 'application/json'
            }
        });
        if (!res.ok) {
            debug('reportpal %s returned %d', url, res.status);
            return null;
        }

        const data = await res.json();
        const rw = data?.currentConditions?.resortwide;
        if (!rw) return null;

        // Base depth: can be "30" or "24 - 48" (range) — take the first number
        let baseDepth = 0;
        const loc = data.currentConditions?.resortLocations?.location?.[0];
        if (loc?.base?.inches) {
            const baseStr = String(loc.base.inches);
            const parsed = parseInt(baseStr);
            if (!isNaN(parsed)) baseDepth = parsed;
        }

        const result = {
            lifts: { open: rw.numLiftsOpen || 0, total: rw.numLiftsTotal || 0 },
            trails: { open: rw.numTrailsOpen || 0, total: rw.numTrailsTotal || 0 },
            groomed: rw.numTrailsGroomed || 0,
            baseDepth
        };

        debug('%s stats: %o', resort.id, result);
        return result;
    } catch (e) {
        debug('reportpal stats error for %s: %s', resort.id, e.message);
        return null;
    }
}
