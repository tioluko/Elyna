
const recipes = [{
    /////////////////////
    name: 'Health Potion',
    req_items: [[12, 2]],req_skills: ['Med',2],dt: 10,
    result: 15,
},{
    name: 'Hi-Health Potion',
    req_items: [[12, 3],[13, 2]],req_skills: ['Med',4],dt: 15,
    result: 16,
},{
    name: 'X-Health Potion',
    req_items: [[12, 4],[13, 3],[14, 2]],req_skills: ['Med',6],dt: 20,
    result: 17,
},{
    name: 'Roasted Meat',
    req_items: [[2, 1]],req_skills: ['Bio',2],dt: 10,
    result: 11,
},{
    name: 'Meat Bun',
    req_items: [[2, 1],[21, 1]],req_skills: ['Bio',4],dt: 15,
    result: 22,
}
];
module.exports = { recipes };
// Talvez as pericias do sistema não funcionem bem aqui....
//`Adicionar novas skills e remover td que não vai ser usado depois?
// + Cooking, Flora, Fauna ,Riding, Sailing
// - Infiltration, Informatic, Exatas, biologicas, Humanas, Veiculos
// Rename Occultism to Mysticism because the supernatural is not that occult here (and use it for enchanting later on)
// Rename Magic to Spellcasting?
// Rename Politics to Social/speaking?
