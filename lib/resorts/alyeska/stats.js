import Debug from 'debug';

const debug = Debug('liftie:stats:alyeska');

const REPORT_URL = 'https://www.alyeskaresort.com/mountain-report-winter';

export default async function fetchStats() {
    try {
        const res = await fetch(REPORT_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ski-this-weekend/1.0)',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
        if (!res.ok) return null;
        const html = await res.text();

        // Trails: <span class="divider">52 / 76</span> followed by "Trails Open"
        let trails = { open: 0, total: 76 };
        const trailMatch = html.match(/class="divider">(\d+)\s*\/\s*(\d+)<[\s\S]*?Trails Open/i);
        if (trailMatch) {
            trails = { open: parseInt(trailMatch[1]), total: parseInt(trailMatch[2]) };
        }

        // Groomed: elementor-heading-title with number, followed by "Groomed"
        let groomed = 0;
        const groomedMatch = html.match(/elementor-heading-title[^>]*>\s*(\d+)\s*<[\s\S]*?Groomed/i);
        if (groomedMatch) {
            groomed = parseInt(groomedMatch[1]);
        }

        // Base depth: "Base" label preceded by snow depth values
        // Pattern: *Snow Depth heading, then 15", 58", 109", then Base, Middle, Top
        // The base value is the first number before "Base"
        let baseDepth = 0;
        const depthMatch = html.match(/Snow Depth[\s\S]*?elementor-heading-title[^>]*>\s*(\d+)[""\u2033]/i);
        if (depthMatch) {
            baseDepth = parseInt(depthMatch[1]);
        }

        // Lifts: count ● OPEN and ● CLOSED markers
        const liftsOpen = (html.match(/● OPEN/g) || []).length;
        const liftsClosed = (html.match(/● CLOSED/g) || []).length;
        const liftsHold = (html.match(/● HOLD/gi) || []).length;
        const liftsTotal = liftsOpen + liftsClosed + liftsHold;

        const result = {
            lifts: { open: liftsOpen, total: liftsTotal || 8 },
            trails,
            groomed,
            baseDepth
        };

        debug('Alyeska stats: %o', result);
        return result;
    } catch (e) {
        debug('Alyeska stats error: %s', e.message);
        return null;
    }
}
