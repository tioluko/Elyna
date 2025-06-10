
//THIS IS WIP
//OK?
//OK.

const info = {
    //Respostas padrões
    has_character: `:star: Você já tem um personagem! :star:`,
    no_character: `:star: Você ainda não tem um personagem, use **/criarficha** para criar um! :star:`,
    character_created:  `:star: Seu personagem nasceu! :star:\n\nAgora você pode usar os seguintes comandos para customiza-lo:\n**/nome** Altera o seu nome.\n**/avatar** Altera a sua imagem.\n**/pc** Investe seus pontos de atributos (PCs)\n**/pp** Investe seus pontos de perícias (PPs)\n**/ficha** exibe sua ficha completa`,

    //Mensagens de erro erro bug etc
    _combat_not_found_: `⚠️ Combate não encontrado ou em estado inválido.`,
    _invalid_action_: `❌ Ação inválida.`,
    _command_error_: `❌ Erro ao executar o comando.`
}
const ficha = {
    //Itens do menu ficha
    acc: `Acessórios`,
    nomods: `Sem modificadores`,
    empty: `<vazio>`,
    base_stats:`Atributos Básicos`,
    secondary_stats: `Atributos Derivados`

}
const st = {
    //terms
    nv: "Nível",
    pc: "PC",
    pp: "PP",
    hp: "PV",
    mp: "PM",
    sp: "PE",
    rp: "PR",
    for: "Força",
    agi: "Agilidade",
    res: "Resistência",
    int: "Inteligência",
    car: "Carisma",
    ess: "Essência",
    sin: "Sintonia"
    //Fazer atributos secundarios depois seu preguiçoso de merda
}
const combate = {
    victory: `🏆 Vitória! **{name}** ganhou **{xp} XP**!`,
    defeat: `⚰️ Você foi derrotado...`,
    loot: `📦 Loot: {items}`

};

module.exports = {
    info,
    ficha,
    st,
    combate
};
