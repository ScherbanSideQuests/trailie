import Debug from 'debug';

const debug = Debug('liftie:stats:camelback');

const REPORT_URL = 'https://conditions.camelbackresort.com/conditions/snow-report/';

// Extract number from SnowReport-measure dd by label
// e.g. <dt>Open Lifts</dt><dd>9 Lifts</dd>
function parseMeasure(html, label) {
    const re = new RegExp(
        '<dt>' + label + '</dt>\\s*<dd>\\s*(\\d+)',
        'i'
    );
    const m = html.match(re);
    return m ? parseInt(m[1]) : 0;
}

export default async function fetchStats() {
    try {
        const res = await fetch(REPORT_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)' }
        });
        if (!res.ok) return null;
        const html = await res.text();

        const openLifts = parseMeasure(html, 'Open Lifts');
        const openTrails = parseMeasure(html, 'Open Trails');
        const groomed = parseMeasure(html, 'Grooming');

        // Base Depth: "16 - 60 in." — take the first (low) number
        let baseDepth = 0;
        const baseMatch = html.match(/<dt>Base Depth<\/dt>\s*<dd>\s*(\d+)/i);
        if (baseMatch) {
            baseDepth = parseInt(baseMatch[1]);
        }

        // Total lifts/trails from the interactive trail map page
        // For now use the open counts as a floor; totalTrails is set in resorts.ts
        const result = {
            lifts: { open: openLifts, total: 9 },
            trails: { open: openTrails, total: 39 },
            groomed,
            baseDepth
        };

        debug('Camelback stats: %o', result);
        return result;
    } catch (e) {
        debug('Camelback stats error: %s', e.message);
        return null;
    }
}
