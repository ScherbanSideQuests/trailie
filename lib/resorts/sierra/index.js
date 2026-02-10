export { default as fetchStats } from './stats.js';

export default {
  selector: '.lifts-list.active tbody tr',
  parse: {
    name: 1,
    status: 2
  }
};
