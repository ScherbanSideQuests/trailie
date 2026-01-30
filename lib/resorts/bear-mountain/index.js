import mtnpowder from '../../tools/mtnpowder.js';

export default {
    // Bear Mountain ID is 58
    api: () => mtnpowder.api(58),
    parse: (data) => mtnpowder.parse(data, 58)
};
