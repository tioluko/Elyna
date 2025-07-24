const { info } = require('../data/locale.js');

function Resting(user) {
    if (user.EVENT?.startsWith('rest:')) {
        return info.on_rest;
    }
    return null;
}

function onEvent(user) {
    if (user.EVENT?.startsWith('combate:')) {
        return info.on_event;
    }
    return null;
}

function noChar(user) {
    if (!user) {
        return info.no_character;
    }
    return null;
}

module.exports = { Resting, onEvent, noChar };
