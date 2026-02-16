export { default as fetchStats } from './stats.js';

export default {
  selector: '[data-lift]',
  parse: {
    name: {
      attribute: 'data-name'
    },
    status: {
      attribute: 'data-status',
      fn: s => s.split(',').pop()
    }
  }
};
