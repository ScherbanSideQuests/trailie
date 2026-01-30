import mtnpowder from '../../tools/mtnpowder.js';

export default {
    // Snow Summit ID is 57
    api: () => mtnpowder.api(57),
    parse: (data) => mtnpowder.parse(data, 57)
};
