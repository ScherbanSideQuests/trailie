import Debug from 'debug';
import pipe from '../lifts/pipe.js';
import { hour } from '../tools/millis.js';
import alterra from '../tools/alterra.js';

const debug = Debug('liftie:stats');

fetch.interval = {
    active: hour,
    inactive: 12 * hour
};

export default async function fetch(resort, fn) {
    debug('Fetch stats for %s', resort.id);

    // Try to load a specific stats parser
    let parse;
    let descriptor;
    try {
        descriptor = await import(`../resorts/${resort.id}/index.js`);
        parse = descriptor.stats;
    } catch (e) {
        // console.log('No specific stats parser for', resort.id);
    }

    // 1. Try resort-specific fetchStats hook
    if (descriptor?.fetchStats) {
        try {
            const data = await descriptor.fetchStats(resort);
            if (data) return fn(null, data);
        } catch (e) {
            debug('fetchStats failed for %s: %s', resort.id, e.message);
        }
    }

    // 2. Try Alterra API if we can find a resortId
    const apiPath = resort.api?.pathname;
    const resortIdMatch = apiPath?.match(/\/feed\/(\d+)\//);
    const resortId = resortIdMatch ? resortIdMatch[1] : null;

    if (resortId) {
        const data = await alterra.api(resortId);
        if (data) {
            return fn(null, data);
        }
    }

    // Fallback to Alterra-style parser as default
    if (!parse) {
        parse = alterra.parse;
    }

    const url = resort.statsUrl || resort.url;
    pipe(url, parse, fn);
}
