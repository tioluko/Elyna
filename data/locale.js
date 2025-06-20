//THIS IS WIP
//OK?
//OK.

const info = {
    //Respostas padrões
    has_character: `:star: You already have a character! :star:`,
    no_character: `:star: You don't have a character yet, use **/newcharacter** to make one! :star:`,
    character_created: `:star: Rejoice, your character is born! :star:\n\nYou can now use the following commands to customize it:\n**/name** Change your name.\n**/avatar** Change your image.\n**/bp** Invest your character points (BPs)\n**/pp** Invest your skill points (PPs)\n**/profile** Display your entire character sheet`,
    set_name: `Your character name is`,

    //Mensagens de erro erro bug etc
    _combat_not_found_: `⚠️ Combat not found or in an invalid state.`,
    _invalid_action_: `❌ Invalid action.`,
    _command_error_: `❌ Error executing the command.`,
};
const pc = {
    pc_menu: `This is your BP distribution menu`,
    wrong_menu: `:star: This menu isn't for you buddy... :star:`,
    pcs: `Available BPs`,
};
const pp = {
    nopp_1: `This costs`,
    nopp_2: `you only have`,
    olpp_1: `Your skill in`,
    olpp_2: `will exceed the limit *(The max skill value is your Level+3)*`,
    pdpp_1: `you increased your skill in`,
    to: `to`,
    paying: `paying`,
    pdpp_2: `You still have`,
};
const ava = {
    invalid_url: `:star: That's not even a URL... :star:`,
    no_img: `:star: I can't see any image in this url :star:`,
    this_is: `Esse é o visual de`,
};
const eq ={
    no_char: `You don't have a character yet, use /newcharacter to create one!`,
    on_event: `Impossible, resolve your current situation first ( /act )`,
    inv_opt: `Invalid option`,
    put: `You equipped`,
    off: `You removed`,
};
const map ={
    aaaa: `aaaaaa`,
};
const ficha = {
    //Itens do menu ficha
    acc: `Accessories`,
    nomods: `No modifiers`,
    empty: `<empty>`,
    base_stats: `Primary Stats`,
    secondary_stats: `Secondary Stats`,
    skills: `Skills`,
    perks: `Perks`,
    no_perk: `No Perks **(wtf? plz report this)**`,
    combat_stats: `Combat Info`,
    equip: `Equipment`,
    moves: `Battle Actions`,
    inventory: `Inventory`,
    wg: `Total weight`,
};
const st = {
    //terms
    nv: "Level",
    pc: "BP",
    pp: "PP",
    hp: "HP",
    mp: "MP",
    sp: "SP",
    rp: "RP",
    for: "Strength",
    agi: "Agility",
    res: "Resistence",
    int: "Intelligence",
    car: "Charisma",
    ess: "Essence",
    sin: "Tuning",
    rm: "MR",
    gm: "MD",
    re: "RE",
    mov: "MOV",
    eq: "BA",
    per: "PER",
    rd: "DR",
    rm_: "Mental Resistance",
    gm_: "Magic Defense",
    re_: "Reaction",
    mov_: "Movement",
    eq_: "Balance",
    per_: "Perception",
    rd_: "Damage Reduction",
    des: "Unarmed Combat",
    arb: "Melee Weapons",
    arq: "Archery",
    adf: "Firearms",
    atl: "Athletics",
    art: "Performing Arts",
    bio: "Biology",
    exa: "Mathematics",
    hum: "Humanities",
    ocu: "Occultism",
    eng: "Engineering",
    inf: "Stealth",
    ifm: "Informática",
    inv: "Computing",
    mag: "Spellcasting",
    med: "Medicine",
    pol: "Politics",
    sub: "Subterfuge",
    vei: "Vehicles",
    ctdmg: "blunt damage",
    crdmg: "slashing damage",
    pndmg: "piercing damage",
    chdmg: "shocking damage",
    cgdmg: "freezing damage",
    qmdmg: "burning damage",
    vtdmg: "vital damage",
    epdmg: "special damage"
};
const act = {
    no_char: `You don't have a character yet, use /newcharacter to create one!`,
    on_event: `Impossible, resolve your current situation first ( /act )`,
    inv_opt: `Invalid Option`,
    cant_pay: `:star: You are unable to pay this action cost... :star:`,
    no_combat_pr:`:star: You can't use Rythm Points for this action. :star:`,
    tr: `Body`,
    cb: `Head`,
    bd: `Right Arm`,
    be: `Left Arm`,
    pd: `Right Leg`,
    pe: `Left Leg`
}
const ce = {
    vic: `Victory!`,
    dft: `Defeat...`,
    loot: `Loot`,
    got: `gained`,
    on: `in`,  //só "in"
    is_unc: `is unconscious`,
    wont_act: `won't act`,
    c0: `keeping very close,`,
    c1: `approaches and`,
    c2: `try approaching and`,
    c3: `barely reaching,`,
    r0: `unable to get any distance,`,
    r1: `try taking some distance and`,
    r2: `keeping the distance,`,
    r3: `keeping some good distance,`,
    use: `uses`,
    pr_eff: `with extra effort`,
    hit: `Hit Roll`,
    def: `Defense Roll`,
    crit: `CRITICAL`,
    no_pr: `Out of Rythm`,
    tk: `takes`,
    runfail: `was unable to escape`,
    run: `ran away`,
    miss: `missed`,
    bal: `loses balance`
};
const cf = {
    blitz: `:star: **Blitz On** :star:`,
    rest: `restores`,
    pv: `HP`,
    pr: `RP`,
    running: `is trying to run away`,
    resroll: `Resistance Roll`,
    psn_res: `resists the poison`,
    the_psn: `The poison in`,
    intensifies: `intensifies`,
    is_psn: `is poisoned`,
    is_bld: `is bleeding`,
    is_brn: `is on fire`,
    is_stn: `is stunned`,
    is_plz: `is paralyzed`,
    is_nau: `is nauseated`,
    tk: `takes`,
    add_psn: `is further poisoned`,
    add_bld: `is bleeding even more`,
    add_brn: `is on more fire`,
    add_stn: `is stunned harder`,
    add_plz: `is paralyzed harder`,
    add_nau: `is further nauseated`,
    psn_dmg: `poison damage`,
    bld_dmg: `bleed damage`,
    brn_dmg: `flame damage`,
    acd_dmg: `acid damage`
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
