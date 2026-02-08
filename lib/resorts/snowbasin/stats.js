import Debug from 'debug';
import { parseDocument } from 'htmlparser2';
import { selectAll } from 'css-select';

const debug = Debug('liftie:stats:snowbasin');

const REPORT_URL = 'https://www.snowbasin.com/the-mountain/mountain-report/';

function deepText(node) {
  if (node.type === 'text') return node.data;
  if (!node.children) return '';
  return node.children.map(deepText).join('');
}

export default async function fetchStats() {
  const res = await fetch(REPORT_URL);
  if (!res.ok) return null;

  const html = await res.text();
  const result = {};

  // Trails: <p class="mc__heading mc__h3">Trails Open</p> ... <span class="mc__num-lg">71 /</span> 115
  const trailsMatch = html.match(/Trails Open<\/p>[\s\S]*?mc__num-lg[^>]*>(\d+)\s*\/<\/span>\s*(\d+)/);
  if (trailsMatch) {
    result.trails = { open: parseInt(trailsMatch[1]), total: parseInt(trailsMatch[2]) };
    debug('trails: %d/%d', result.trails.open, result.trails.total);
  }

  // Lifts: <p class="mc__heading mc__h3">Lifts Open</p> ... <span class="mc__num-lg">12 /</span> 13
  const liftsMatch = html.match(/Lifts Open<\/p>[\s\S]*?mc__num-lg[^>]*>(\d+)\s*\/<\/span>\s*(\d+)/);
  if (liftsMatch) {
    result.lifts = { open: parseInt(liftsMatch[1]), total: parseInt(liftsMatch[2]) };
    debug('lifts: %d/%d', result.lifts.open, result.lifts.total);
  }

  // Base depth: DOM approach — find <p class="mc__heading mc__h4">Base</p>,
  // then grab the mc__num in the preceding sibling
  const dom = parseDocument(html);
  const headings = selectAll('.mc__heading.mc__h4', dom);
  for (const heading of headings) {
    if (deepText(heading).trim() !== 'Base') continue;

    // Walk backward through siblings to find the mc__num
    let sibling = heading.prev;
    while (sibling) {
      if (sibling.attribs?.class?.includes('mc__num')) {
        const text = deepText(sibling);
        const match = text.match(/(\d+)/);
        if (match) {
          result.baseDepth = parseInt(match[1]);
          debug('base depth: %d"', result.baseDepth);
        }
        break;
      }
      sibling = sibling.prev;
    }
    break;
  }

  return Object.keys(result).length > 0 ? result : null;
}
