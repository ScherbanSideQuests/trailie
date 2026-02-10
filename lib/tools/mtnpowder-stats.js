import Debug from 'debug';

const debug = Debug('liftie:stats:mtnpowder');

/**
 * Generic mtnpowder v3 stats fetcher for single-resort feeds.
 * Each resort that uses this must have a `statsUrl` in resort.json
 * with the full feed URL including bearer_token and resortId.
 *
 * Usage from a resort's index.js:
 *   export { default as fetchStats } from '../../tools/mtnpowder-stats.js';
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
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        if (!res.ok) {
            debug('mtnpowder feed %s returned %d', url, res.status);
            return null;
        }

        const data = await res.json();
        if (!data?.Resorts?.length) return null;

        const sr = data.Resorts[0].SnowReport;
        if (!sr) return null;

        // Pick best available base depth: base > mid-mountain > SnowBaseRangeIn
        let baseDepth = 0;
        if (sr.BaseArea?.BaseIn && sr.BaseArea.BaseIn !== '--') {
            baseDepth = parseInt(sr.BaseArea.BaseIn) || 0;
        } else if (sr.MidMountainArea?.BaseIn && sr.MidMountainArea.BaseIn !== '--') {
            baseDepth = parseInt(sr.MidMountainArea.BaseIn) || 0;
        } else if (sr.SnowBaseRangeIn && sr.SnowBaseRangeIn !== '--') {
            // SnowBaseRangeIn can be "18 - 48" or just "47"
            const parts = sr.SnowBaseRangeIn.split('-').map(s => parseInt(s.trim()));
            baseDepth = parts[0] || 0;
        }

        const result = {
            lifts: { open: sr.TotalOpenLifts || 0, total: sr.TotalLifts || 0 },
            trails: { open: sr.TotalOpenTrails || 0, total: sr.TotalTrails || 0 },
            groomed: sr.GroomedTrails || 0,
            baseDepth
        };

        debug('%s stats: %o', resort.id, result);
        return result;
    } catch (e) {
        debug('mtnpowder stats error for %s: %s', resort.id, e.message);
        return null;
    }
}
