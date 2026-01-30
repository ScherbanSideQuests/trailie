import mtnpowder from '../../tools/mtnpowder.js';

export default {
  // Snow Valley ID is 173
  api: () => mtnpowder.api(173),
  parse: (data) => mtnpowder.parse(data, 173)
};
