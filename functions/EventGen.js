const { db } = require('../utils/db.js');
const { events } = require('../data/eventos.js');

function getEvent(tipo,cont = 0,ocup = 0,rank = 1) {
    const eventosFiltrados = events.filter(evento => {
        return (
            evento.tipos.includes(tipo) &&
            cont >= (evento.contMin || 0) &&
            ocup >= (evento.ocupMin || 0) &&
            rank >= (evento.rankMin || 0)
        );
    });

    if (eventosFiltrados.length === 0) return null;

    const evento = eventosFiltrados[Math.floor(Math.random() * eventosFiltrados.length)];

    // Sorteia um item reward
    let itemId = null;
    let itemNome = null;
    if (evento.reward && evento.reward.length > 0) {
        itemId = evento.reward[Math.floor(Math.random() * evento.reward.length)];
        // Puxa nome do item do banco
        const stmt = db.prepare('SELECT nome FROM items WHERE id = ?');
        const item = stmt.get(itemId);

        if (item) {
            itemNome = item.nome;
        }
    }

    // Gera um número aleatório para {x} (ajuste isso com base no rank se quiser)
    const qtd = Math.floor(Math.random() * (rank + 1)) + 1;

    // Substitui {x} e {y} na mensagem
    let msg = evento.msg.replace('{x}', qtd);
    if (itemNome) {
        msg = msg.replace('{y}', itemNome);
    } else {
        msg = msg.replace('{y}', 'something');
    }

    return {
        msg: msg,
        itemId: itemId,
        itemNome: itemNome,
        qtd: qtd,
        eventoId: evento.id,
        special: evento.special
    };
}


function addItem(userId, itemId, quantidade) {
    const stmtCheck = db.prepare(`
    SELECT quantidade FROM user_inventory
    WHERE user_id = ? AND item_id = ?
    `);

    const existing = stmtCheck.get(userId, itemId);

    if (existing) {
        const stmtUpdate = db.prepare(`
        UPDATE user_inventory
        SET quantidade = quantidade + ?
        WHERE user_id = ? AND item_id = ?
        `);
        stmtUpdate.run(quantidade, userId, itemId);
    } else {
        const stmtInsert = db.prepare(`
        INSERT INTO user_inventory (user_id, item_id, quantidade)
        VALUES (?, ?, ?)
        `);
        stmtInsert.run(userId, itemId, quantidade);
    }
}

module.exports = { getEvent , addItem };
