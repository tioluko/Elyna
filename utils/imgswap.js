const { db } = require('./db.js'); // ajuste o caminho se necessário

const oldPrefix = 'https://raw.githubusercontent.com/tioluko/Elyna/refs/heads/main/';
const newPrefix = 'https://elyna.netlify.app/';

function atualizarLinksDeImagem() {
    const npcs = db.prepare('SELECT id, image FROM npcs').all();

    const atualizar = db.prepare('UPDATE npcs SET image = ? WHERE id = ?');
    let alterados = 0;

    for (const npc of npcs) {
        if (npc.image && npc.image.startsWith(oldPrefix)) {
            const novoLink = npc.image.replace(oldPrefix, newPrefix);
            atualizar.run(novoLink, npc.id);
            alterados++;
        }
    }

    console.log(`✅ ${alterados} imagens atualizadas para usar Netlify.`);
}

atualizarLinksDeImagem();
