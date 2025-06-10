const mapa = require('../data/map.json');

// Acesso rápido de tile
function getTile(x, y) {
    if (y < 0 || y >= mapa.tipo.length || x < 0 || x >= mapa.tipo[0].length) return null;

    return {
        x, y,
        tipo: mapa.tipo[y][x],
        rank: mapa.rank[y][x],
        clima: mapa.clima[y][x],
        nome: mapa.nome[y][x],
        ocupacao: mapa.ocupação[y][x],
        contaminacao: mapa.contaminação[y][x],
        recursos: mapa.recursos[y][x]
    };
}

function getLocalGrid(x, y, range = 1) {
    const grid = [];
    for (let dy = -range; dy <= range; dy++) {
        const row = [];
        for (let dx = -range; dx <= range; dx++) {
            row.push(getTile(x + dx, y + dy));
        }
        grid.push(row);
    }
    return grid;
}

module.exports = { getLocalGrid, getTile };
