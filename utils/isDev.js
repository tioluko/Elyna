const { devs } = require('../config.json');

module.exports = function isDev(userId) {
    return devs.includes(userId);
};
