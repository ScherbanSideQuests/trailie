import Debug from 'debug';
import { parseDocument } from 'htmlparser2';
import { selectAll } from 'css-select';

const debug = Debug('liftie:stats:boyne');

function select(dom, selector) {
  return selectAll(selector, dom);
}

// Recursive text — parseDocument keeps whitespace nodes that findText chokes on
function deepText(node) {
  if (node.type === 'text') return node.data;
  if (!node.children) return '';
  return node.children.map(deepText).join('');
}

/**
 * Fetch and parse Boyne/Highlands printable reports for stats
 * URL pattern: https://globalconditionsfeed.azurewebsites.net/{resortCode}/printablereports
 */
export default async function fetchStats(resort) {
  const url = resort.statsUrl;
  if (!url) return null;

  const fullUrl = `${url.host}${url.pathname}`;
  const res = await fetch(fullUrl);
  if (!res.ok) return null;

  const html = await res.text();
  const dom = parseDocument(html);
  const result = {};

  // Open trails: <td id="openTrails">55<br/><div>TRAILS OF 55</div></td>
  const openTrailsEl = select(dom, '#openTrails')[0];
  if (openTrailsEl) {
    const text = deepText(openTrailsEl);
    const open = text?.match(/(\d+)/);
    const caption = select(openTrailsEl, '#trails_caption')[0];
    const capText = caption ? deepText(caption) : null;
    const total = capText?.match(/OF (\d+)/i);
    if (open) {
      result.trails = {
        open: parseInt(open[1]),
        total: total ? parseInt(total[1]) : null
      };
    }
  }

  // Open lifts: <td id="openLifts">8<br/><div>LIFTS OF 8</div></td>
  const openLiftsEl = select(dom, '#openLifts')[0];
  if (openLiftsEl) {
    const text = deepText(openLiftsEl);
    const open = text?.match(/(\d+)/);
    const caption = select(openLiftsEl, '#lifts_caption')[0];
    const capText = caption ? deepText(caption) : null;
    const total = capText?.match(/OF (\d+)/i);
    if (open) {
      result.lifts = {
        open: parseInt(open[1]),
        total: total ? parseInt(total[1]) : null
      };
    }
  }

  // Base depth: <td id="base"><span id="base_total"><text>44''</text></span></td>
  const baseEl = select(dom, '#base_total')[0];
  if (baseEl) {
    const text = deepText(baseEl);
    const match = text?.match(/(\d+)/);
    if (match) {
      result.baseDepth = parseInt(match[1]);
    }
  }

  // Open acres: <td id="acres">435<br/><div>ACRES OF 435</div></td>
  const acresEl = select(dom, '#acres')[0];
  if (acresEl) {
    const text = deepText(acresEl);
    const open = text?.match(/(\d+)/);
    const caption = select(acresEl, '#acres_caption')[0];
    const capText = caption ? deepText(caption) : null;
    const total = capText?.match(/OF (\d+)/i);
    if (open) {
      result.acres = {
        open: parseInt(open[1]),
        total: total ? parseInt(total[1]) : null
      };
    }
  }

  debug('Boyne stats: %O', result);
  return Object.keys(result).length > 0 ? result : null;
}
