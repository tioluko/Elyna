const { DEBUG } = require('../config.js');
const { db, getUserData, updateUserData, getUserInventory, updateUserInventory, getUserPerks, updateUserPerks } = require('../utils/db.js');

function createNewUser(user) {
  return {
    id: user.id,
    nome: user.username,
    image: user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png' // fallback para avatar padrão
  };
};

function update(u) {
  updateUserData(u.id, calculateStats(u));
}
function updateNpc(u) {
  Object.assign(u.id, calculateStats(u));
}
function freshstats(u) {
  //const u = getUserData(user.id);
  return {
    RXP: 10 + (((u.NV - 1)**2) * 10),
    MPV: 10 + ((u.RES + u.TAM) * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPV || 0),
    MPM: 10 + (u.ESS * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPM || 0),
    MPE: 10 + (u.CAR * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPE || 0),
    MPR: Math.max(u.Adf, u.Arq, u.Des, u.Arb, u.Atl, u.Mag) + (u.modPR || 0),
    PV: 10 + ((u.RES + u.TAM) * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPV || 0),
    PM: 10 + (u.ESS * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPM || 0),
    PE: 10 + (u.CAR * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPE || 0),
    PR: Math.max(u.Adf, u.Arq, u.Des, u.Arb, u.Atl, u.Mag) + (u.modPR || 0),
    RM: Math.floor((u.CAR + (u.modCAR || 0) + u.INT + (u.modINT || 0)) / 2),
    GM: 10 + u.NV + u.ESS + (u.modESS || 0),
    RE: Math.floor((u.AGI + (u.modAGI || 0) + u.INT + (u.modINT || 0)) / 2),
    MOV: Math.floor((u.FOR + (u.modFOR || 0) + u.AGI + (u.modAGI || 0)) / 2),
    EQ: (u.FOR + (u.modFOR || 0)) * 2,
    PER: u.INT + (u.modINT || 0) + u.Inv,
    DEF: Math.min(10 - u.TAM , 10) + Math.max(u.TAM * -2 , 0)
  };
  if (DEBUG) console.log("Applying fullheal updates:", updates);
 // updateUserData(u.id, updates);
}

function addxp(u, amt) {
  let xp = u.XP + amt;
  let nv = u.NV;
  let rxp = 10 + ((u.NV - 1) ** 2) * 10;
  let pcUp = u.PC;
  let ppUp = u.PP;
  let LvUp = 0;

  while (xp >= rxp) {
    nv++;
    rxp = 10 + ((nv - 1) ** 2) * 10;
    pcUp += 3;
    ppUp += (u.INT + 6);
    LvUp++;
  }

  const updates = {
    XP: xp,
    NV: nv,
    RXP: rxp,
    PC: pcUp,
    PP: ppUp
  };

  if (DEBUG) console.log(`XP recebido: +${amt} → NV ${u.NV} ⇨ ${nv} (${LvUp}x up)`);
  updateUserData(u.id, updates);
}

function calculateStats(u) {
  return {
    MPV: 10 + ((u.RES + u.TAM) * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPV || 0),
    MPM: 10 + (u.ESS * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPM || 0),
    MPE: 10 + (u.CAR * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPE || 0),
    MPR: Math.max(u.Adf, u.Arq, u.Des, u.Arb, u.Atl, u.Mag) + (u.modPR || 0),
    RM: Math.floor((u.CAR + (u.modCAR || 0) + u.INT + (u.modINT || 0)) / 2),
    GM: 10 + u.NV + u.ESS + (u.modESS || 0),
    RE: Math.floor((u.AGI + (u.modAGI || 0) + u.INT + (u.modINT || 0)) / 2),
    MOV: Math.floor((u.FOR + (u.modFOR || 0) + u.AGI + (u.modAGI || 0)) / 2),
    EQ: (u.FOR + (u.modFOR || 0)) * 2,
    PER: u.INT + (u.modINT || 0) + u.Inv,
    DEF: Math.min(10 - u.TAM , 10) + Math.max(u.TAM * -2 , 0)
  };
}

function fullheal(u) {
  //const u = getUserData(user.id);
  const updates = {
    PV: u.MPV,
    PM: u.MPM,
    PE: u.MPE,
    PR: u.MPR
  };
  if (DEBUG) console.log("Applying fullheal updates:", updates);
  updateUserData(u.id, updates);
}

function handleSkillCost(user, move, pr) {
  if (DEBUG) console.log(move.custoPV + move.custoPM + move.custoPR + pr);
  if ( move.custoPV + move.custoPM + move.custoPR + pr === 0) return true;

  else if ( user.PV > move.custoPV && user.PM >= move.custoPM && user.PR >= move.custoPR + pr ) {
    user.PV -= move.custoPV;
    user.PM -= move.custoPM;
    user.PR -= move.custoPR+pr;

    if (DEBUG) console.log("Paying action cost:",move.custoPV,",",move.custoPM,",",(move.custoPR+pr),"->", "PV:", user.PV, "PM:", user.PM, "PR:", user.PR);
    return true;
  }

  else return false;
};

/*function payMoveCost(u,v,m,r,p) {
  u.PV -= v;
  u.PM -= m;
  u.PR -= r+p;
  if (DEBUG) console.log("Paying action cost:",v,",",m,",",(r+p),"->", "PV:", u.PV, "PM:", u.PM, "PR:", u.PR);
}*/

function modApply(user) {
  //reset
  for (const key in user) {
      if (key.startsWith('mod')||(key.startsWith('RD') && key !== "RD") ) {
        user[key] = 0;
    }
  }
  // Zerar todos os mod* no banco também
  const allModKeys = Object.keys(user).filter(k => k.startsWith('mod')||(k.startsWith('RD') && k !== "RD"));
  const zeroMods = Object.fromEntries(allModKeys.map(k => [k, 0]));
  updateUserData(user.id, zeroMods);

  // Agora pegar perks + itens e aplicar normalmente...
  const inventoryRows = getUserInventory(user.id);
  const perkRows = getUserPerks(user.id);

  const modsource = [];
  // Itens equipados
  for (const inv of inventoryRows) {
    //if (!inv.equipado) continue;
    //const item = itemsById[inv.item_id] || inv.item || inv;
    if (!inv.equipado || !inv.mods) continue;
    modsource.push(inv);
  }

  // Perks do usuário
  for (const perkRef of perkRows) {
    //const perk = perksById[perkRef.perk_id] || perkRef.perk || perkRef;
    if (!perkRef.mods) continue;
    modsource.push(perkRef);
  }

  // Aplicar os modificadores acumulados
  for (const source of modsource) {
    let mods;
    try {
      mods = typeof source.mods === 'string'
      ? JSON.parse(source.mods)
      : source.mods;
    } catch (e) {
      if (DEBUG) console.warn(`Modificadores inválidos em ID ${source.id}:`, source.mods);
      continue;
    }

    for (const key in mods) {
      if (DEBUG) console.log(`Aplicando ${key}: +${mods[key]}`);
      if (!user.hasOwnProperty(key)) user[key] = 0;
      user[key] += mods[key];
    }
  }
  // Salvar todos os mod* no banco
  const modUpdates = {};
  for (const key in user) {
    if (key.startsWith('mod')||(key.startsWith('RD') && key !== "RD") ) {
      modUpdates[key] = user[key];
    }
  }

  if (Object.keys(modUpdates).length > 0) {
    updateUserData(user.id, modUpdates);
  }

  return user;
}

function total(user, stat) {
  const base = user[stat] || 0;
  const mod = user[`mod${stat}`] || 0;
  return base + mod;
}

function getTotalStats(user) {
  const stats = {};
  for (const key in user) {
    // Detecta atributos base como 'FOR', 'MOV', etc.
    if (
      user.hasOwnProperty(key) &&
      !key.startsWith('mod') &&
      typeof user[key] === 'number'
    ) {
      const modKey = `mod${key}`;
      const modValue = user[modKey] || 0;
      stats[key] = user[key] + modValue;
    }
  }
  return stats;
}

function npcInitialize(u) {
  return {
    MPV: 10 + ((u.RES + u.TAM) * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPV || 0),
    MPM: 10 + (u.ESS * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPM || 0),
    MPE: 10 + (u.CAR * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPE || 0),
    MPR: Math.max(u.Adf, u.Arq, u.Des, u.Arb, u.Atl, u.Mag) + (u.modPR || 0),
    PV: 10 + ((u.RES + u.TAM) * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPV || 0),
    PM: 10 + (u.ESS * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPM || 0),
    PE: 10 + (u.CAR * (u.NV + 2)) + ((u.NV - 1) * 4) + (u.modPE || 0),
    PR: Math.max(u.Adf, u.Arq, u.Des, u.Arb, u.Atl, u.Mag) + (u.modPR || 0),
    RM: Math.floor((u.CAR + (u.modCAR || 0) + u.INT + (u.modINT || 0)) / 2),
    GM: 10 + u.NV + u.ESS + (u.modESS || 0),
    RE: Math.floor((u.AGI + (u.modAGI || 0) + u.INT + (u.modINT || 0)) / 2),
    MOV: Math.floor((u.FOR + (u.modFOR || 0) + u.AGI + (u.modAGI || 0)) / 2),
    EQ: (u.FOR + (u.modFOR || 0)) * 2,
    PER: u.INT + (u.modINT || 0) + u.Inv,
    DEF: Math.min(10 - u.TAM , 10) + Math.max(u.TAM * -2 , 0)
  };
}
function barCreate(user, type) {
  let bar = ["","","",""]; let blk = ""; let eblk = ":black_large_square:"; let blocks = 5; let fill;
  if (type==="ALL"){
    for (let j = 0; j < 4; j++) {
      if (j===0) {blk=[":red_square:","PV","-# ❤️"] }
      if (j===1) {blk=[":blue_square:","PM","-# 💧"] }
      if (j===2) {blk=[":green_square:","PE","-# 🧩"] }
      if (j===3) {blk=[":yellow_square:","PR","-# ⚡"] }

      const current = user[blk[1]];
      const max = user["M" + blk[1]];
      fill = current <= 0 ? 0 : current >= max ? blocks : Math.min(blocks - 1, Math.max(1, Math.round((current / max) * blocks)));
      /*if (user[blk[1]] <= 0) {fill = 0} else if (user[blk[1]] >= user["M"+blk[1]]) {
        fill = blocks;
      } else {
        fill = Math.min(blocks - 1, Math.max(1, Math.round(((user[blk[1]] / user["M"+blk[1]]) * blocks))));
      }*/

      bar[j] += blk[2];
      for (let i = 0; i < blocks; i++) {
        bar[j] += i < fill ? blk[0] : eblk;
      }
    }
    return (bar[0]+"\n"+bar[1]+"\n"+bar[2]+"\n"+bar[3]);

  }else{
    if (type==="PV") {blk=[":red_square:","PV","❤️"] }
    if (type==="PM") {blk=[":blue_square:","PM","💧"] }
    if (type==="PE") {blk=[":green_square:","PE","🧩"] }
    if (type==="PR") {blk=[":yellow_square:","PR","⚡"] }

    const current = user[blk[1]];
    const max = user["M" + blk[1]];
    fill = current <= 0 ? 0 : current >= max ? blocks : Math.min(blocks - 1, Math.max(1, Math.round((current / max) * blocks)));
    /*if (user[blk[1]] <= 0) {fill = 0} else if (user[blk[1]] >= user["M"+blk[1]]) {fill = blocks}
    else {
      fill = Math.min(blocks - 1, Math.max(1, Math.round(((user[blk[1]] / user["M"+blk[1]]) * blocks))));
    }*/

    bar[0] += blk[2];
    for (let i = 0; i < blocks; i++) {
      bar[0] += i < fill ? blk[0] : eblk;
    }
    return bar[0];
  }
}

module.exports = {
  createNewUser,
  update,
  updateNpc,
  calculateStats,
  freshstats,
  addxp,
  fullheal,
  handleSkillCost,
  modApply,
  total,
  getTotalStats,
  npcInitialize,
  barCreate
};
