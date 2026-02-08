import Debug from 'debug';

const debug = Debug('liftie:stats:bigsky');

const TRAILS_API = 'https://apim-marketing-001.azure-api.net/FeedService/v1/Feed/Facilities/Areas/Trails/All?resortName=bs';
const LIFTS_API = 'https://apim-marketing-001.azure-api.net/FeedService/v1/Feed/Facilities/Areas/Lifts/All?resortName=bs';

export default async function fetchStats() {
  const [trailsRes, liftsRes] = await Promise.all([
    fetch(TRAILS_API),
    fetch(LIFTS_API)
  ]);

  if (!trailsRes.ok || !liftsRes.ok) return null;

  const trails = await trailsRes.json();
  const lifts = await liftsRes.json();

  const result = {
    trails: {
      open: trails.filter(t => t.status === 'Open').length,
      total: trails.length
    },
    lifts: {
      open: lifts.filter(l => l.status === 'Open').length,
      total: lifts.length
    }
  };

  debug('Big Sky stats: %O', result);
  return result;
}
