//THIS IS WIP
//OK?
//OK.

const info = {
  //Respostas padrões
  has_character: `:star: Você já tem um personagem! :star:`,
  no_character: `:star: Você ainda não tem um personagem, use **/criarficha** para criar um! :star:`,
  character_created: `:star: Seu personagem nasceu! :star:\n\nAgora você pode usar os seguintes comandos para customiza-lo:\n**/nome** Altera o seu nome.\n**/avatar** Altera a sua imagem.\n**/pc** Investe seus pontos de atributos (PCs)\n**/pp** Investe seus pontos de perícias (PPs)\n**/ficha** exibe sua ficha completa`,
  set_name: `O nome do seu personagem é`,

  //Mensagens de erro erro bug etc
  _combat_not_found_: `⚠️ Combate não encontrado ou em estado inválido.`,
  _invalid_action_: `❌ Ação inválida.`,
  _command_error_: `❌ Erro ao executar o comando.`,
};
const pc = {
  pc_menu: `Esse é o seu Menu de distribuição de PCs`,
  wrong_menu: `:star: Esse menu não é para o seu personagem :star:`,
  pcs: `PCs disponíveis`,
};
const pp = {
  nopp_1: `Isso custa`,
  nopp_2: `você só tem`,
  olpp_1: `Sua perícia em`,
  olpp_2: `vai passar do limite assim *(O valor máximo de uma perícia é equivalente ao seu Nivel+3)*`,
  pdpp_1: `aumentou sua perícia em`,
  to: `para`,
  paying: `pagando`,
  pdpp_2: `Restam`, //You still have
};
const ava = {
  invalid_url: `:star: Isso nem é uma url... :star:`,
  no_img: `:star: Não vejo imagem nessa url :star:`,
  this_is: `Esse é o visual de`,
};
const eq ={
  no_char: `Você ainda não tem um personagem, use /criarficha para criar um!`,
  on_event: `Impossível, resolva sua situação atual antes ( /ação )`,
  inv_opt: `Opção inválida`,
  put: `Você se equipou com`,
  off: `Você removeu`
};
const map ={
  aaaa: `aaaaaa`,
};
const ficha = {
  //Itens do menu ficha
  acc: `Acessórios`,
  nomods: `Sem modificadores`,
  empty: `<vazio>`,
  base_stats: `Atributos Básicos`,
  secondary_stats: `Atributos Derivados`,
  skills: `Perícias`,
  perks: `Peculiaridades`,
  no_perk: `Sem Peculiaridades**(wtf? plz report this)**`,
  combat_stats: `Atributos de Combate`,
  equip: `Equipamento`,
  moves: `Ações de Combate`,
  inventory: `Inventório`,
  wg: `Peso total`,
};
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
  sin: "Sintonia",
  rm: "RM",
  gm: "GM",
  re: "RE",
  mov: "MOV",
  eq: "EQ",
  per: "PER",
  rd: "RD",
  rm_: "Resistência Mental",
  gm_: "Guarda Magica",
  re_: "Reação",
  mov_: "Movimento",
  eq_: "Equilíbrio",
  per_: "Percepção",
  rd_: "Redução de Dano",
  des: "Desarmado",
  arb: "Armas Brancas",
  arq: "Arquearia",
  adf: "Armas de Fogo",
  atl: "Atletismo",
  art: "Artes Performáticas",
  bio: "Biologicas",
  exa: "Exatas",
  hum: "Humanas",
  ocu: "Ocultismo",
  eng: "Engenharia",
  inf: "Infiltração",
  ifm: "Informática",
  inv: "Investigação",
  mag: "Magia",
  med: "Medicina",
  pol: "Politica",
  sub: "Subterfúgio",
  vei: "Veículos",
  ctdmg: "de dano contundente",
  crdmg: "de dano cortante",
  pndmg: "de dano penetrante",
  chdmg: "de dano chocante",
  cgdmg: "de dano congelante",
  qmdmg: "de dano queimante",
  vtdmg: "de dano vital",
  epdmg: "de dano especial"
};
const act = {
  no_char: `Você ainda não tem um personagem, use /criarficha para criar um!`,
  on_event: `Impossível, resolva sua situação atual antes ( /ação )`,
  inv_opt: `Opção inválida`,
  cant_pay: `:star: Aw, parece que você não pode pagar o custo dessa ação... :star:`,
  no_combat_pr:`:star: Você não pode usar Ponto de Ritmo fora de combate. :star:`
}
const ce = {
  vic: `Vitória!`,
  dft: `Você foi derrotado...`,
  loot: `Loot`,
  got: `ganhou`,
  on: `nos restos de`,  //só "in"
  is_unc: `está inconsciente`,
  wont_act: `não age`,
  c0: `se mantendo bem próximo,`,     // `maintaning close combat,`
  c1: `se aproxima e`,                // `approaches and`
  c2: `tenta se aproximar e`,         // `try approaching and`
  c3: `mal conseguindo acompanhar,`,  // `barely reaching,`
  r0: `não conseguindo se afastar,`,     // `unable to get any distance,`
  r1: `tenta recuar e`,                  // `try taking some distance and`
  r2: `recua e`,                         // `took some distance and`
  r3: `recua bastante e`,                // `took some good distance and`
  use: `usa`,                            //uses
  pr_eff: `com esforço extra`,
  hit: `Acerto`, //Hit Roll
  def: `Defesa`,  //Defense Roll
  crit: `CRÍTICO`,
  no_pr: `Sem Ritmo`,
  tk: `sofre`, //takes
  runfail: `não conseguiu escapar`,
  run: `fugiu`,
  miss: `errou o ataque`,
  bal: `se desequilibra`
};
const cf = {
  blitz: `:star: **Blitz ativado** :star:`,
  rec_pr: `se reequilibra recuperando`,
  running: `está tentando fugir`,
  resroll: `Teste de Resistência`,
  psn_res: `resiste ao veneno`,
  the_psn: `O veneno em`,
  intensifies: `se intensifica`,
  is_psn: `foi envenenado`,
  is_bld: `está sangrando`,
  is_brn: `está em chamas`,
  is_plz: `está sob paralisia`,
  is_nau: `está com náusea`,
  tk: `sofre`,
  more: `ainda mais`,
  harder: `forte`,
  psn_dmg: `de dano vital por envenamento`,
  bld_dmg: `de dano vital por sangramento`,
  brn_dmg: `de dano queimante pelas chamas`,
};

module.exports = {
  info,
  ficha,
  pc,
  pp,
  ava,
  eq,
  map,
  st,
  act,
  ce,
  cf
};
