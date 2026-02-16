import Debug from 'debug';

const debug = Debug('liftie:stats:taos');

/**
 * Taos Ski Valley stats fetcher. The site is a Next.js App Router app
 * that embeds all data in RSC flight data chunks (self.__next_f.push).
 * We concatenate the chunks and extract snowfallData, liftData, and
 * slopeData as JSON.
 */
export default async function fetchStats() {
    const url = 'https://www.skitaos.com/lifts';
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html'
            }
        });
        if (!res.ok) {
            debug('taos %s returned %d', url, res.status);
            return null;
        }
        const html = await res.text();
        return parseHtml(html);
    } catch (e) {
        debug('taos stats error: %s', e.message);
        return null;
    }
}

/**
 * Extract the concatenated RSC flight data from self.__next_f.push() chunks.
 */
function extractRscStream(html) {
    const chunks = [];
    const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        chunks.push(JSON.parse('"' + m[1] + '"'));
    }
    return chunks.join('');
}

/**
 * Find a data array section in the stream by prefix, return the
 * substring containing the array elements (without outer brackets).
 */
function extractDataArray(stream, prefix) {
    const idx = stream.indexOf(prefix);
    if (idx === -1) return null;
    const arrStart = idx + prefix.length;
    let depth = 0;
    for (let i = arrStart; i < stream.length; i++) {
        if (stream[i] === '[') depth++;
        if (stream[i] === ']') {
            if (depth === 0) return stream.substring(arrStart, i);
            depth--;
        }
    }
    return null;
}

/**
 * Parse the Taos HTML page and extract stats from RSC flight data.
 * Exported for unit testing.
 */
export function parseHtml(html) {
    const stream = extractRscStream(html);
    if (!stream) return null;

    // Base depth from snowfallData
    let baseDepth = 0;
    const sfMatch = stream.match(/"snowfallData":\{[^}]+\}/);
    if (sfMatch) {
        try {
            const sf = JSON.parse('{' + sfMatch[0] + '}');
            baseDepth = sf.snowfallData?.base ?? 0;
        } catch { /* ignore parse errors */ }
    }

    // Lifts from liftData.winter
    let liftsOpen = 0, liftsTotal = 0;
    const liftDataIdx = stream.indexOf('"liftData":');
    if (liftDataIdx !== -1) {
        const liftWinter = stream.substring(liftDataIdx).match(/"winter":\{"total":(\d+),"limit":\d+,"skip":\d+,"data":\[/);
        if (liftWinter) {
            liftsTotal = parseInt(liftWinter[1]);
            const prefix = liftWinter[0];
            const arrStart = stream.indexOf(prefix, liftDataIdx) + prefix.length;
            const arrStr = extractDataArray(stream, prefix.slice(0, -1) + '[') // re-extract cleanly
                ?? (() => { // fallback: extract from position
                    let depth = 0;
                    for (let i = arrStart; i < stream.length; i++) {
                        if (stream[i] === '[') depth++;
                        if (stream[i] === ']') {
                            if (depth === 0) return stream.substring(arrStart, i);
                            depth--;
                        }
                    }
                    return '';
                })();
            liftsOpen = (arrStr.match(/"status":"open"/g) || []).length;
        }
    }

    // Slopes from slopeData.winter
    let trailsOpen = 0, trailsTotal = 0;
    const slopeDataIdx = stream.indexOf('"slopeData":');
    if (slopeDataIdx !== -1) {
        const slopeWinter = stream.substring(slopeDataIdx).match(/"winter":\{"total":(\d+),"limit":\d+,"skip":\d+,"data":\[/);
        if (slopeWinter) {
            trailsTotal = parseInt(slopeWinter[1]);
            const prefix = slopeWinter[0];
            const arrStart = stream.indexOf(prefix, slopeDataIdx) + prefix.length;
            let depth = 0, arrStr = '';
            for (let i = arrStart; i < stream.length; i++) {
                if (stream[i] === '[') depth++;
                if (stream[i] === ']') {
                    if (depth === 0) { arrStr = stream.substring(arrStart, i); break; }
                    depth--;
                }
            }
            trailsOpen = (arrStr.match(/"open":true/g) || []).length;
        }
    }

    if (trailsTotal === 0 && liftsTotal === 0) return null;

    const result = {
        lifts: { open: liftsOpen, total: liftsTotal },
        trails: { open: trailsOpen, total: trailsTotal },
        groomed: 0,
        baseDepth
    };

    debug('taos totals: %o', result);
    return result;
}
