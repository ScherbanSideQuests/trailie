import { fetchFromApi, parseResortData } from '../../tools/mtnpowder.js';

const RESORT_ID = 57;

export default async function fetchSnowSummitLifts() {
    try {
        const data = await fetchFromApi(RESORT_ID);
        if (!data) return {};
        const parsed = parseResortData(data, RESORT_ID);
        if (!parsed?.lifts) return {};
        const result = {};
        for (let i = 0; i < parsed.lifts.open; i++) {
            result[`Lift ${i + 1}`] = 'open';
        }
        for (let i = parsed.lifts.open; i < parsed.lifts.total; i++) {
            result[`Lift ${i + 1}`] = 'closed';
        }
        return result;
    } catch (e) {
        console.error('Snow Summit parse error:', e);
        return {};
    }
}
