import Debug from 'debug';

const debug = Debug('liftie:stats:powdr');

export default async function fetchStats(resort) {
  const host = resort.api?.host;
  if (!host) return null;

  const trailsUrl = `${host}/api/v1/dor/drupal/trails`;
  const snowUrl = `${host}/api/v1/dor/drupal/snow-reports`;
  const liftsUrl = `${host}/api/v1/dor/drupal/lifts`;

  debug('Fetching Powdr stats for %s from %s', resort.id, host);

  const [trailsRes, snowRes, liftsRes] = await Promise.all([
    fetch(trailsUrl).catch(() => null),
    fetch(snowUrl).catch(() => null),
    fetch(liftsUrl).catch(() => null)
  ]);

  if (!trailsRes?.ok && !snowRes?.ok && !liftsRes?.ok) return null;

  const trails = trailsRes?.ok ? await trailsRes.json() : [];
  const snow = snowRes?.ok ? await snowRes.json() : [];
  const lifts = liftsRes?.ok ? await liftsRes.json() : [];

  const result = {};

  // Trails: only winter alpine trails
  if (Array.isArray(trails)) {
    const winterAlpine = trails.filter(
      t => t.season === 'winter' && t.type === 'alpine_trail'
    );
    const openTrails = winterAlpine.filter(t => t.status === 'open');
    const groomed = winterAlpine.filter(
      t => typeof t.groom_status === 'string' && t.groom_status.startsWith('groomed')
    );

    result.trails = { open: openTrails.length, total: winterAlpine.length };
    result.groomed = groomed.length;

    debug('%s trails: %d/%d open, %d groomed', resort.id, openTrails.length, winterAlpine.length, groomed.length);
  }

  // Lifts: winter non-carpet only
  if (Array.isArray(lifts)) {
    const winterLifts = lifts.filter(
      l => l.season === 'winter' && l.type !== 'carpet'
    );
    const openLifts = winterLifts.filter(l => l.status === 'open');

    result.lifts = { open: openLifts.length, total: winterLifts.length };

    debug('%s lifts: %d/%d open', resort.id, openLifts.length, winterLifts.length);
  }

  // Snow: primary location, most recent report
  if (Array.isArray(snow) && snow.length > 0) {
    const primary = snow.find(
      s => s.location?.name === 'Primary'
    ) || snow[0];

    if (primary?.base_depth != null) {
      result.baseDepth = parseInt(primary.base_depth);
      debug('%s base depth: %d"', resort.id, result.baseDepth);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
