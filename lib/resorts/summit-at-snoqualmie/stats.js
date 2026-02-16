import Debug from 'debug';

const debug = Debug('liftie:stats:snoqualmie');

// Only count the 4 alpine ski areas (exclude Nordic, Uphill Travel, Terrain Parks)
const ALPINE_AREAS = ['Alpental', 'Summit West', 'Summit Central', 'Summit East'];

// Connector trails between areas (e.g. "West to Central Upper") — not real runs
const CONNECTOR_RE = /^(Summit\s+)?(West|Central|East|Alpental)\s+to\s+(Summit\s+)?(West|Central|East|Alpental)/i;

/**
 * Snoqualmie-specific stats fetcher. Computes trail/lift counts from the
 * facilities.areas breakdown instead of unreliable resortwide totals.
 * Excludes Magic Carpet lifts and non-alpine areas (Nordic, Uphill, Parks).
 */
export default async function fetchStats(resort) {
    const feedUrl = resort.statsUrl;
    if (!feedUrl) return null;

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

        const areas = data?.facilities?.areas?.area;
        if (!Array.isArray(areas)) return null;

        let liftsOpen = 0, liftsTotal = 0;
        let trailsOpen = 0, trailsTotal = 0;
        let groomed = 0;

        for (const area of areas) {
            if (!ALPINE_AREAS.includes(area.name)) continue;

            // Count lifts — exclude Magic Carpet
            const lifts = area.lifts?.lift;
            if (Array.isArray(lifts)) {
                for (const lift of lifts) {
                    if (lift.type === 'Magic Carpet') continue;
                    liftsTotal++;
                    if (lift.status === 'Open') liftsOpen++;
                }
            }

            // Count trails — skip connector trails between areas
            const trails = area.trails?.trail;
            if (Array.isArray(trails)) {
                for (const trail of trails) {
                    if (CONNECTOR_RE.test(trail.name)) continue;
                    trailsTotal++;
                    if (trail.status === 'Open') trailsOpen++;
                    if (trail.groomed) groomed++;
                }
            }
        }

        // Base depth from first resort location
        let baseDepth = 0;
        const locations = data.currentConditions?.resortLocations?.location;
        if (Array.isArray(locations)) {
            for (const loc of locations) {
                if (loc?.base?.inches) {
                    const parsed = parseInt(String(loc.base.inches));
                    if (!isNaN(parsed) && parsed > 0) {
                        baseDepth = parsed;
                        break;
                    }
                }
            }
        }

        const result = {
            lifts: { open: liftsOpen, total: liftsTotal },
            trails: { open: trailsOpen, total: trailsTotal },
            groomed,
            baseDepth
        };

        debug('snoqualmie stats: %o', result);
        return result;
    } catch (e) {
        debug('snoqualmie stats error: %s', e.message);
        return null;
    }
}
