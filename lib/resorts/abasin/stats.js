import Debug from 'debug';

const debug = Debug('liftie:stats:abasin');

/**
 * Arapahoe Basin stats fetcher. Parses the snow report HTML page
 * for runs, lifts, base depth, and groomed count.
 */
export default async function fetchStats() {
    const url = 'https://www.arapahoebasin.com/snow-report/';
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html'
            }
        });
        if (!res.ok) {
            debug('abasin %s returned %d', url, res.status);
            return null;
        }
        const html = await res.text();
        return parseHtml(html);
    } catch (e) {
        debug('abasin stats error: %s', e.message);
        return null;
    }
}

export function parseHtml(html) {
    // Summary block: <h5>52<span>/147</span></h5>\n<p>Open Runs</p>
    const runsMatch = html.match(/<h5>(\d+)<span>\/(\d+)<\/span><\/h5>\s*<p>Open Runs<\/p>/);
    const liftsMatch = html.match(/<h5>(\d+)<span>\/(\d+)<\/span><\/h5>\s*<p>Open Lifts<\/p>/);

    // Base depth: 33" <span>Base</span>
    const baseMatch = html.match(/(\d+)"\s*<span>Base<\/span>/);

    // Groomed: count all <img src="/img/sr/groomed.svg" class="grooming-icon" />
    const groomedMatches = html.match(/grooming-icon/g);

    const trailsOpen = runsMatch ? parseInt(runsMatch[1]) : 0;
    const trailsTotal = runsMatch ? parseInt(runsMatch[2]) : 0;
    const liftsOpen = liftsMatch ? parseInt(liftsMatch[1]) : 0;
    const liftsTotal = liftsMatch ? parseInt(liftsMatch[2]) : 0;
    const baseDepth = baseMatch ? parseInt(baseMatch[1]) : 0;
    const groomed = groomedMatches ? groomedMatches.length : 0;

    if (trailsTotal === 0 && liftsTotal === 0) return null;

    const result = {
        lifts: { open: liftsOpen, total: liftsTotal },
        trails: { open: trailsOpen, total: trailsTotal },
        groomed,
        baseDepth
    };

    debug('abasin totals: %o', result);
    return result;
}
