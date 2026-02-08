export { default as fetchStats } from './stats.js';

export default {
  selector: 'tr',
  parse: {
    name: 0,
    status: {
      child: 2,
      fn: s => {
        if (!s) return 'closed';
        const lower = s.toLowerCase().trim();
        if (lower.includes('open')) return 'open';
        if (lower.includes('hold')) return 'hold';
        return 'closed';
      }
    }
  }
};
