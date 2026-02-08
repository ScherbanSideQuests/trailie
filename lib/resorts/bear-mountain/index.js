import Debug from 'debug';
import { fetchFromApi } from '../../tools/mtnpowder.js';
import coerce from '../../tools/coerce.js';

const debug = Debug('liftie:resort:big-bear');

// All 3 Big Bear resorts in one feed call
const RESORT_IDS = [173, 58, 57]; // Snow Valley, Snow Summit, Bear Mountain

export default async function parse() {
    try {
        const data = await fetchFromApi(RESORT_IDS);
        if (!data?.Resorts) return {};

        const result = {};
        for (const resort of data.Resorts) {
            const sr = resort.SnowReport;
            if (!sr?.Lifts) continue;
            const area = sr.BaseArea?.Name || 'Unknown';
            for (const lift of sr.Lifts) {
                result[`${area} - ${lift.Name}`] = coerce(lift.Status);
            }
        }
        debug('Big Bear lifts:', result);
        return result;
    } catch (e) {
        debug('Big Bear parse error:', e);
        return {};
    }
}

export async function fetchStats() {
    try {
        const data = await fetchFromApi(RESORT_IDS);
        if (!data?.Resorts) return null;

        let totalLiftsOpen = 0, totalLifts = 0;
        let totalTrailsOpen = 0, totalTrails = 0;
        let totalGroomed = 0;
        let maxBase = 0;

        for (const resort of data.Resorts) {
            const sr = resort.SnowReport;
            if (!sr) continue;

            totalLiftsOpen += sr.TotalOpenLifts || 0;
            totalLifts += sr.TotalLifts || 0;
            totalTrailsOpen += sr.TotalOpenTrails || 0;
            totalTrails += sr.TotalTrails || 0;
            totalGroomed += sr.GroomedTrails || 0;

            const base = parseInt(sr.BaseArea?.BaseIn || 0);
            if (base > maxBase) maxBase = base;
        }

        const result = {
            lifts: { open: totalLiftsOpen, total: totalLifts },
            trails: { open: totalTrailsOpen, total: totalTrails },
            groomed: totalGroomed,
            baseDepth: maxBase
        };
        debug('Big Bear aggregated stats:', result);
        return result;
    } catch (e) {
        debug('Big Bear stats error:', e);
        return null;
    }
}
