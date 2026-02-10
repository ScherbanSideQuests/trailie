import Debug from 'debug';

const debug = Debug('liftie:stats:sierra');

const REPORT_URL = 'https://sierraattahoe.com/weather-snow-report/';

// Pattern: <em>VALUE</em></strong><span class="status-total">/TOTAL</span>
// Used for Lifts Open, Runs Open, Runs Groomed
function parseStatusValue(html, label) {
    const re = new RegExp(
        label + '[\\s\\S]*?<em>(\\d+)</em>[\\s\\S]*?status-total[^>]*>/(\\d+)',
        'i'
    );
    const m = html.match(re);
    return m ? { open: parseInt(m[1]), total: parseInt(m[2]) } : null;
}

export default async function fetchStats() {
    try {
        const res = await fetch(REPORT_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)' }
        });
        if (!res.ok) return null;
        const html = await res.text();

        const lifts = parseStatusValue(html, 'Lifts Open');
        const trails = parseStatusValue(html, 'Runs Open');
        const groomed = parseStatusValue(html, 'Runs Groomed');

        // Base depth: find "Depth" label, then two heading-6 values (summit, base)
        // We want the base (second value)
        let baseDepth = 0;
        const depthMatch = html.match(
            />\s*Depth\s*<[\s\S]*?font-weight:\s*1000[^>]*>(\d+)&#8243;[\s\S]*?font-weight:\s*1000[^>]*>(\d+)&#8243;/i
        );
        if (depthMatch) {
            baseDepth = parseInt(depthMatch[2]); // second value = base
        }

        const result = {
            lifts: lifts || { open: 0, total: 0 },
            trails: trails || { open: 0, total: 0 },
            groomed: groomed?.open || 0,
            baseDepth
        };

        debug('Sierra stats: %o', result);
        return result;
    } catch (e) {
        debug('Sierra stats error: %s', e.message);
        return null;
    }
}
