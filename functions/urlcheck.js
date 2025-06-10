const fetch = require('node-fetch');

function isValidURL(str) {
    try {
        const url = new URL(str);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

async function checkImage(url, defaultValue = false) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');

        if (!response.ok) return defaultValue;
        return contentType && contentType.startsWith('image/');
    } catch (err) {
        console.error('Erro ao verificar imagem:', err);
        return defaultValue;
    }
}

module.exports = {
    isValidURL,
    checkImage
};
