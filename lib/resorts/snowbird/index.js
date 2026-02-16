import coerce from '../../tools/coerce.js';
export default parse;
export { default as fetchStats } from '../../tools/powdr-stats.js';

function parse(lifts) {
  return Object.fromEntries(lifts.map(({ name, status }) => [name, coerce(status)]));
}
