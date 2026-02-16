import Debug from 'debug';

const debug = Debug('liftie:stats:alta');

const REPORT_URL = 'https://www.alta.com/lift-terrain-status';

export default async function fetchStats() {
    try {
        const res = await fetch(REPORT_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)' }
        });
        if (!res.ok) return null;
        const html = await res.text();

        // Extract window.Alta = {...} from script tag
        const match = html.match(/window\.Alta\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
        if (!match) {
            debug('Could not find window.Alta in HTML');
            return null;
        }

        const data = JSON.parse(match[1]);

        const ops = data.operations || {};
        const conditions = data.conditions || {};

        const baseDepth = parseFloat(conditions.base_depth) || 0;

        const result = {
            lifts: { open: ops.lifts?.open || 0, total: ops.lifts?.total || 0 },
            trails: { open: ops.runs?.open || 0, total: ops.runs?.total || 0 },
            groomed: 0, // Alta doesn't expose groomed count in this data
            baseDepth: Math.round(baseDepth)
        };

        debug('Alta stats: %o', result);
        return result;
    } catch (e) {
        debug('Alta stats error: %s', e.message);
        return null;
    }
}
