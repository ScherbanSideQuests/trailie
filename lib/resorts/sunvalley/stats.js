import Debug from 'debug';

const debug = Debug('liftie:stats:sunvalley');

const TABS = ['report-bald', 'report-dollar'];

// Matches inch marks: " or &#8221; (right double quote) or &#34; or &quot;
const INCH = '(?:&#8221;|&#34;|&quot;|"|\u201D)';

function parseTab(html) {
    let trailsOpen = 0, trailsTotal = 0;
    let liftsOpen = 0, liftsTotal = 0;
    let baseDepth = 0;

    // Trails: <span class="mc__num-lg">99 /</span> 109
    const trailMatch = html.match(/Trails Open<[\s\S]*?mc__num-lg">\s*(\d+)\s*\/<\/span>\s*(\d+)/i);
    if (trailMatch) {
        trailsOpen = parseInt(trailMatch[1]);
        trailsTotal = parseInt(trailMatch[2]);
    }

    // Lifts: <span class="mc__num-lg">12 /</span> 12
    const liftMatch = html.match(/Lifts Open<[\s\S]*?mc__num-lg">\s*(\d+)\s*\/<\/span>\s*(\d+)/i);
    if (liftMatch) {
        liftsOpen = parseInt(liftMatch[1]);
        liftsTotal = parseInt(liftMatch[2]);
    }

    // Base depth: NUMBER + inch mark, then </p></div><p...>Base</p>
    const baseRe = new RegExp(`(\\d+)${INCH}\\s*<\\/p>\\s*<\\/div>\\s*<p[^>]*>\\s*Base\\s*<\\/p>`, 'i');
    const baseMatch = html.match(baseRe);
    if (baseMatch) {
        baseDepth = parseInt(baseMatch[1]);
    }

    return { trailsOpen, trailsTotal, liftsOpen, liftsTotal, baseDepth };
}

/**
 * Sun Valley stats parser. Scrapes the mountain report page and sums
 * data from both Bald Mountain and Dollar Mountain tabs (data-tab sections).
 */
export default async function fetchStats(resort) {
    const url = 'https://www.sunvalley.com/the-mountain/mountain-report';

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html'
            }
        });
        if (!res.ok) {
            debug('sun valley %s returned %d', url, res.status);
            return null;
        }

        const html = await res.text();

        let totalLiftsOpen = 0, totalLiftsTotal = 0;
        let totalTrailsOpen = 0, totalTrailsTotal = 0;
        let maxBase = 0;

        for (const tab of TABS) {
            // Match the content panel (<div class="mc__tab"...>), not the tab button
            const re = new RegExp(
                `<div class="mc__tab[^"]*"[^>]*data-tab="${tab}">[\\s\\S]*?(?=<div class="mc__tab[^"]*"[^>]*data-tab="|$)`
            );
            const section = html.match(re);
            if (!section) continue;

            const data = parseTab(section[0]);
            totalLiftsOpen += data.liftsOpen;
            totalLiftsTotal += data.liftsTotal;
            totalTrailsOpen += data.trailsOpen;
            totalTrailsTotal += data.trailsTotal;
            if (data.baseDepth > maxBase) maxBase = data.baseDepth;

            debug('sun valley %s: trails=%d/%d lifts=%d/%d base=%d',
                tab, data.trailsOpen, data.trailsTotal, data.liftsOpen, data.liftsTotal, data.baseDepth);
        }

        if (totalTrailsTotal === 0 && totalLiftsTotal === 0) return null;

        const result = {
            lifts: { open: totalLiftsOpen, total: totalLiftsTotal },
            trails: { open: totalTrailsOpen, total: totalTrailsTotal },
            groomed: 0,
            baseDepth: maxBase
        };

        debug('sun valley totals: %o', result);
        return result;
    } catch (e) {
        debug('sun valley stats error: %s', e.message);
        return null;
    }
}
