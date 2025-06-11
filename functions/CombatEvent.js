const { DEBUG } = require('../config.js');
const { db, updateUserData, getUserData, getCombatState, getMoveById, getNPC, updateCombat, getUserMoves, getUserPerks } = require('../utils/db.js');
const { npcInitialize } = require('../functions/stats.js');
const { CombatTriggers, hasStatus, removeStatus, addStatus, reduceStatus, getStatusDuration, addDmgTypeEffect } = require('../functions/CombatEffects.js');
const { generateCombatImageBuffer } = require('../utils/ImageGen.js');
const { processLootFromNPC, insertToInventory } = require('../functions/LootGen.js');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const stats = require('./stats');

function createCombat(userId, npcId) {

    const user = getUserData(userId);
    if (!user) throw new Error('Usuário não encontrado');
    stats.modApply(user); // aplica perks/equips etc

    const npc = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
    if (!npc) throw new Error('NPC não encontrado');


    const userClone = { ...user };

    for (const perk of getUserPerks(userId)) {
        const mods = JSON.parse(perk.mods || '{}');

        for (const key in mods) {
            if (key.startsWith('tag')) {
                const tag = key.slice(3); // remove "tag:"
                addStatus(userClone, tag);
            }
        }
    }

    //userClone.STATUS = user.STATUS;
    //userClone.STATUS = JSON.stringify([...JSON.parse(user.STATUS || '[]')]);

    const npcBase = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
    // Clona NPC com update de stats
    const npcClone = { ...npcBase };
    npcClone.STATUS = user.STATUS;

    const derived = npcInitialize(npcClone);

    Object.assign(npcClone, derived); // safe in-memory update

    const userDataJSON = JSON.stringify(userClone);
    const npcDataJSON = JSON.stringify(npcClone);

    // Cria combate
    const result = db.prepare(`
    INSERT INTO combat (user_id, npc_id, user_data, npc_data, dist, state)
    VALUES (?, ?, ?, ?, 0, 'waiting')
    `).run(userId, npcId, userDataJSON, npcDataJSON);

    // Atualiza evento do jogador
    db.prepare('UPDATE users SET EVENT = ? WHERE id = ?').run(`combate:${result.lastInsertRowid}`, userId);

    return result.lastInsertRowid;
}

/*function chooseNpcAction(npc) {
    const moveSlots = [1, 2, 3].filter(i => npc[`move_${i}`]); // só slots válidos
    const selectedSlot = moveSlots[Math.floor(Math.random() * moveSlots.length)];

    const moveId = npc[`move_${selectedSlot}`];
    const mods = npc[`mod_move_${selectedSlot}`] || null;

    return {
        move: `move:${moveId}`,
        mods
    };
}*/
function chooseNpcAction(npc) {
    const opts = [
        [npc.move_1, npc.mod_move_1],
        [npc.move_2, npc.mod_move_2],
        [npc.move_3, npc.mod_move_3],
    ].filter(([id]) => id);

    const [id, mods] = opts[Math.floor(Math.random() * opts.length)];

    return {
        move: `move:${id}`,
        id: id,
        mods: mods ? JSON.parse(mods) : null
    };
}

function pickBodyPart(u) {
    const options = ["cb", "tr", "tr", "tr", "tr", "tr", "bd", "be", "pd", "pe"].filter(Boolean);
    if (u.exBdpart1 !== "none") options.push("e1");
    if (u.exBdpart2 !== "none") options.push("e2");
    //if (u.exBdpart3 !== "none") options.push("e3");
    //if (u.exBdpart4 !== "none") options.push("e4");//just in case....
    const filtered = options.filter(opt => u["RD" + opt] !== null);
    const rand = filtered[Math.floor(Math.random() * filtered.length)];
    if (DEBUG) console.log(filtered);
    switch (rand) {
        case "cb": return [ "RD"+rand , "na cabeça", 2];
        case "tr": return [ "RD"+rand , "no tronco", 1];
        case "bd": return [ "RD"+rand , "no braço direito", 0.5];
        case "be": return [ "RD"+rand , "no braço esquerdo", 0.5];
        case "pd": return [ "RD"+rand , "na perna direita", 0.5];
        case "pe": return [ "RD"+rand , "na perna esquerda", 0.5];
        case "e1": return [ "RD"+rand , "na " + u.exBdpart1, 0.5];
        case "e2": return [ "RD"+rand , "na " + u.exBdpart2, 0.5];
        //case "e3": return [ "RD"+rand , "na " + u.exBdpart3, 0.5];
        //case "e4": return [ "RD"+rand , "na " + u.exBdpart4, 0.5];//just in case....
    }
}

async function processCombatAction(user, move, pr, combateId) {

    if (DEBUG) console.time('initial data reading');
    const startMem5 = process.memoryUsage().heapUsed;

    const combat = getCombatState(user.id);
    if (!combat || combat.state !== 'waiting') return '⚠️ Combate não encontrado ou em estado inválido.';

    const player = JSON.parse(combat.user_data); // já é a cópia em memória
    const npc = JSON.parse(combat.npc_data);

    const moveId = move.id;
    if (!move) return '❌ Ação inválida.';

    ///////////Round Start//////////////
    if (DEBUG) console.log("valor de PR dentro da função:", pr)
    if (pr) addStatus(player, "PR_BOOST");
    ////////////////////////////////////

    /*updateCombat(combateId, {
        user_action: `move:${moveId}`,
        user_action_data: JSON.stringify(move)
    });*/

    // Se ainda não tem ação do inimigo, gerar e salvar
    if (!combat.npc_action) {

        const npc = JSON.parse(combat.npc_data);
        const npcAction = chooseNpcAction(npc);
        updateCombat(combateId, { npc_action: npcAction.move });

        // Recarrega o estado e processa novamente
        const combatUpdated = getCombatState(user.id);
        return await processCombatAction(user, move, pr, combateId);
    }

    // Resolver turno
    //const npc = JSON.parse(combat.npc_data);
    const npcAction = chooseNpcAction(npc);
    if (DEBUG) console.log(npcAction)
    const npcMoveId = npcAction.id;
    const npcMove = getMoveById(npcMoveId);

    if (npcAction.mods) {
        try {
            const mods = npcAction.mods;
            for (const key in mods) {
                if (key in npcMove && typeof npcMove[key] === 'number') {
                    npcMove[key] += mods[key];
                }
            }
        } catch (err) {
            console.warn(`[⚠️ NPC MODS] Erro ao aplicar mods em ${npcMoveId}:`, err.message);
        }
    }
    // Verifica se há modificadores associados
    if (DEBUG) console.log('[DEBUG] player_move_data:', JSON.stringify(move));
    if (DEBUG) console.log('[DEBUG] npc_move_data:', JSON.stringify(npcMove));
    updateCombat(combateId, {
        user_action: `move:${moveId}`,
        user_action_data: JSON.stringify(move),
        npc_action: npcAction.move,
        npc_action_data: JSON.stringify(npcMove)
    });

    stats.updateNpc(player);
    stats.updateNpc(npc);

    if (DEBUG) console.timeEnd('initial data reading'),console.log(`Memória usada: ${((process.memoryUsage().heapUsed - startMem5) / 1024 / 1024).toFixed(2)}MB`);


    ////Turn Order and Dist Setup//////
    const result = resolveCombatTurn(player, npc, move, npcMove, combat.dist);
    ///////////////////////////////////

    ///Check if the battle is over//////
    const end = result.user.PV <= 0 || result.npc.PV <= 0 || hasStatus(result.user, "FUGA") ;
    if (DEBUG) console.log(end);
    const defeat = result.user.PV <= 0 && result.npc.PV > 0;
    const draw = result.user.PV <= 0 && result.npc.PV <= 0;
    const win = result.user.PV > 0 && result.npc.PV <= 0;
    ///////////////////////////////////


    updateCombat(combateId, {
        dist: 0,
        user_action: null,
        npc_action: null,
        user_action_data: null,
        npc_action_data: null,
        user_data: JSON.stringify(player),
        npc_data: JSON.stringify(npc),
        state: end ? 'ended' : 'waiting'
    });

    if (end) {
        updateUserData(player.id, {
            PV: result.user.PV,
            PM: result.user.PM,
            PR: result.user.MPR,
            //STATUS: end ? "none" : user.STATUS,
            EVENT: "none"
        });
        let exp = 0;
        let loot = [];
        if (win) {
            exp = npc.NV || 1;
            stats.addxp(player, exp);

            const loot = processLootFromNPC(npc); // <- captura resultado
            await insertToInventory(user.id, loot); // Insere
            const lootText = formatLootSummary(loot);   // Escreve o log

            // loot = generateLoot(npc); // <- Loot futura aqui?
            result.log += `\n🏆 Vitória! **${user.nome}** ganhou **${exp} XP**!`;
            if (loot !== null) result.log += `\n📦 ${lootText} nos restos de ${npc.nome}`;
        }
        if (defeat || draw) {result.log += `\n⚰️ Você foi derrotado...`;}
        else {result.log += ``;}
    }

    let playerDead = result.user.PV <= 0;
    let npcDead = result.npc.PV <= 0;


    const imageBuffer = await generateCombatImageBuffer(user.image, npc.image, playerDead, npcDead);
    const file = new AttachmentBuilder(imageBuffer, { name: 'vs.png' });

    const embed = new EmbedBuilder()
    .setTitle(`⚔️ __**${user.nome}**__ \u2003x\u2003 __**${npc.nome}**__ ⚔️ `)
    .setImage('attachment://vs.png')
    .setDescription(result.log)
    .addFields(
        { name: '\u200B', value: stats.barCreate(player,"PV")+'\u2003 '+stats.barCreate(npc,"PV")+'\n'+
            stats.barCreate(player,"PM")+'\u2003 '+stats.barCreate(npc,"PM")+'\n'+
            stats.barCreate(player,"PR")+'\u2003 '+stats.barCreate(npc,"PR"), inline: true });

    return {
        embeds: [embed],
        files: [file]
    };
}

function resolveCombatTurn(user, npc, userMove, npcMove, dist) {

    /*const order = (user.RE + user.modRE + Number(userMove.ModINI || 0)) >=
    (npc.RE + npc.modRE + Number(npcMove.ModINI || 0))*/
    console.log(hasStatus(user, "STUN"));
    if (DEBUG) console.log("Move ini bonus:",userMove.INI);
    const playerIni = (stats.total(user, "RE") + Number(userMove.INI || 0) - (hasStatus(user, "STUN") ? Math.ceil(getStatusDuration(user, "STUN")/2) : 0 ));
    const npcIni = (stats.total(npc, "RE") + Number(npcMove.INI || 0)  - (hasStatus(npc, "STUN") ? Math.ceil(getStatusDuration(npc, "STUN")/2) : 0 ))
    const order = playerIni >= npcIni || (userMove.EFFECT === "FUGA")
    ? [[user, npc, userMove, npcMove], [npc, user, npcMove, userMove]]
    : [[npc, user, npcMove, userMove], [user, npc, userMove, npcMove]];


    if (DEBUG) console.log("Distância inicial:", dist);
    if (DEBUG) console.log("Iniciativas (player/npc):"+ (stats.total(user, "RE") + Number(userMove.INI || 0)) +"("+playerIni+") ,"+(stats.total(npc, "RE") + Number(npcMove.INI || 0)) +"("+npcIni+")");

    const logs = [];

    const resultUserMove = getMoveDist(user, userMove);
    const resultNpcMove = getMoveDist(npc, npcMove);

    //const totalDist = Math.max(0, resultUserMove.distChange + resultNpcMove.distChange);
    const totalDist = resultUserMove.distChange + resultNpcMove.distChange;
    if (DEBUG) console.log("Distancia alterada por ações:", totalDist);

    for (const [actor, target, move, targetMove] of order) {
        if (target.PV <= 0) {
            logs.push(`☠️ ${target.nome} já está derrotado, ${actor.nome} não age.`);
            continue;
        }

        const result = resolveAttack(actor, target, totalDist, move, targetMove);
        logs.push(result.log);

        // Se o oponente morreu, cancela a sequência
        if (target.PV <= 0) break;
    }

    return {
        log: logs.join('\n'),
        newDist: 0,
        user,
        npc
    };
}

function resolveAttack(attacker, defender, dist, move, defenderMove) {
    const log = [];

    const defpericia = defenderMove.pericia;
    const ac = move.AC || 0;
    const re = move.RE || 0;
    const chcri = move.CHCRI || 0;
    const mod = move.DN || 0;
    const alc = move.ALC || 0;
    const effect = move.EFFECT || "none";

    const tags = [
        ...JSON.parse(attacker.STATUS || '[]'),
        ...(effect ? [effect] : [])
    ];

    //Rolagem de dados
    const rollAtk = roll2d10();
    const rollDef = roll2d10();
    const rollPR = hasStatus(attacker, "PR_BOOST")? roll1d10() : 0;
    const rollRun = hasStatus(defender, "PR_BOOST")&&hasStatus(defender, "FUGA")? roll1d10() : 0;
    let acerto = 0;
    let dano = 0;
    let danofinal = 0;
    let crit = (rollAtk.d1 === 10 && rollAtk.d2 === 10) ? move.DNCRI : 1;
    let defesa = stats.total(defender, "RE") + (defender[defpericia] || 0);
    let movtexto = "";
    let extexto = "";

    ////////ON ACTION MOVE EFFECT////////////////////////////////
    if (DEBUG) console.log('MOVE EFFECT:', effect);
    for (const tag of tags) {
        if (CombatTriggers.onAction?.[tag]) {
            if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
            const eff = CombatTriggers.onAction[tag](attacker, log);
            if (DEBUG) console.log('RESULTADO:', eff);
            if (eff) {
                for (const key in eff) {
                    if (key === 'consome' || key === 'break') continue; // trata depois
                    try {
                        eval(`${key} += ${eff[key]}`);
                    } catch (err) {
                        console.warn(`[⚠️ TAG TRIGGER] Falha ao aplicar '${key}':`, err.message);
                    }
                }
                if (eff?.consome) removeStatus(attacker, tag);
                if (eff?.break) return {
                    log: log.join('\n'),
                };

            }
        }
    }
    /////////////////////////////////////////////


    //Calculo dos valores de Acerto/Dano acordo tipo de atk e rolagems anteriores
    const bonus = moveFormulae(attacker, dist, move);
    acerto = rollAtk.total + rollPR + bonus.acerto;
    dano = bonus.dano * crit;
    movtexto = bonus.desc;

    //Mostra o ataque utilizado e a forma que foi utilzada
    if (DEBUG) console.log("BonusDefesa:"+ stats.total(defender, "RE") +"+"+ (defender[defpericia]));
    log.push(`**${attacker.nome}** ${movtexto} `+
    (rollPR > 0 ? ` com esforço extra` :"")+
    ` usa ${move.nome}!`);

    /////////////////////////////////////////////////////////////////////
    ////ATTACKER STATUS BEFORE HIT///
    if (DEBUG) console.log('STATUS DO ATTACKER:', attacker.STATUS);
    for (const tag of tags) {
        if (CombatTriggers.onHitBefore?.[tag[0]]) {
            if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
            const eff = CombatTriggers.onHitBefore[tag[0]](attacker, log);
            if (DEBUG) console.log('RESULTADO:', eff);
            if (eff) {
                for (const key in eff) {
                    if (key === 'consome') continue; // trata depois
                    try {
                        eval(`${key} += ${eff[key]}`);
                    } catch (err) {
                        console.warn(`[⚠️ TAG TRIGGER] Falha ao aplicar '${key}':`, err.message);
                    }
                }
                if (eff?.consome) {
                    removeStatus(attacker, tag[0]);
                }
            }
        }
    }
    ////////////////////////////////////////////////////////////////////



    //Mensagem do Roll de acerto
    log.push(`🎲 Acerto: ** ${acerto} ** \u2003 *2d10* {[${rollAtk.d1}, ${rollAtk.d2}] + `+
    (rollPR > 0 ? ` *1d10* [${rollPR}] + ` : "")+
    `${acerto - (rollAtk.total + rollPR)}}`+
    (crit > 1 ? ` 🔥🔥 ***CRÍTICO!!!*** 🔥🔥` : ""));

    //////////////////////////////////////////////
    //Determina a defesa total e checar se tem PR
    const dificuldade = (defender.PR <= 0) ? defender.DEF : rollDef.total + rollRun + defesa;
    //////////////////////////////////////
    if (DEBUG) console.log("DEF minima:"+ defender.DEF);
    //Mensagem do Roll de defesa
    log.push(defender.PR <= 0
    ? `🚫 Defesa: ** ${dificuldade} **  \u2003 *Sem Ritmo*`
    :`🎲 Defesa: ** ${dificuldade} ** \u2003 *2d10* {[${rollDef.d1}, ${rollDef.d2}] + `+
    (rollRun > 0 ? ` *1d10* [${rollRun}] + ` : "")+
    `${defesa}}`);

    ////Checa se acertou//////////////////////////
    if (acerto >= dificuldade || crit > 1) {
        // 🎯 Acertou

        ////Pega a parte do corpo atingida e RD da mesma///////////////
        const bpRD = pickBodyPart(defender); //array: 0 nome da var de RD, 1 texto da parte do corpo, 2 modificador de dano
        if (DEBUG) console.log("RD no" + defender[bpRD[1]] +":"+ defender[bpRD[0]]);

        ////Calcula o Dano final e atualiza PV////////
        danofinal = Math.max(Math.floor(Math.max(1,dano * [bpRD[2]])) - (defender.RD + defender[bpRD[0]] || 0),0);
        defender.PV -= danofinal;

        ////Mensagem de dano//////////////
        log.push(` **${defender.nome}** sofre **${danofinal}** de dano ${bonus.ele} ${bpRD[1]} ${bonus.ico}`);

        /////////////////////////////////////////
        ////////ON ACTION MOVE EFFECT////////////////////////////////
        if (DEBUG) console.log('HIT EFFECT:', effect);
        for (const tag of tags) {
            if (CombatTriggers.onHitEffect?.[tag]) {
                if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
                const eff = CombatTriggers.onHitAfter[tag](defender, log);
                if (DEBUG) console.log('RESULTADO:', eff);
                if (eff) {
                    for (const key in eff) {
                        if (key === 'consome' || key === 'break') continue; // trata depois
                        try {
                            eval(`${key} += ${eff[key]}`);
                        } catch (err) {
                            console.warn(`[⚠️ TAG TRIGGER] Falha ao aplicar '${key}':`, err.message);
                        }
                    };
                }
            }
        }
        /////////////////////////////////////////////

        /////////////////////////////////////////
        // DEFENDER STATUS ON HIT
        if (hasStatus(defender, "FUGA")) removeStatus(defender, "FUGA"), log.push(`⚠️ **${defender.nome}** não conseguiu escapar`);
        /////////////////////////////////////////
        // HEAVY DAMAGE
        if (Math.floor(danofinal >= (stats.total(defender, "RES")*3))) addDmgTypeEffect(defender, move.ELE, log, 2);
        else if (Math.floor(danofinal >= (stats.total(defender, "RES")*2))) addDmgTypeEffect(defender, move.ELE, log);
        /////////////////////////////////////////

        ////Se ultrapassou EQ, perde PR
        if (Math.floor(dano * [bpRD[2]]) > defender.EQ) {
            defender.PR -= 1;
            log.push(`⚠️ **${defender.nome}** se desequilibra`);
        }
        /////////////////////////////////////////
    } else {
        log.push(` ${attacker.nome} errou o ataque❌`);
        if (hasStatus(defender, "FUGA")) {
            log.push(`\n💨 **${defender.nome} fugiu!**`);
            return {
                log: log.join('\n'),
            }
        }
    }
    //////////////////////////////////
    ////Apply end round effects///////
    for (const tag of tags) {
        if (CombatTriggers.onTurnEnd?.[tag[0]]) {
            if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
            CombatTriggers.onTurnEnd[tag[0]](attacker, log);
            if (DEBUG) console.log('RESULTADO:', tag);
        }
    }
    /*if (hasStatus(attacker, "POISON")) {
        attacker.PV -= 1;
        reduceStatus(attacker, "POISON"); // reduz 1 turno
        log.push(`**${attacker.nome}** sofre **1** de dano vital pelo veneno! 🤢`);
    }*/
    ///////////////////////////////////IMPROVE LATER!!!!

    const cond = Math.round((100 * defender.PV) / stats.total(defender, "MPV"));
    if (DEBUG) console.log(defender.PV+" , "+cond+"%");
    extexto = cond > 99 ? `${defender.nome} está ok \n`//Exibir status effects aqui também?
    : cond > 75 ? `${defender.nome} está levemente ferido \n`
    : cond > 50 ? `${defender.nome} está ferido \n`
    : cond > 25 ? `${defender.nome} está muito ferido \n`
    : cond > 0 ? `${defender.nome} está á beira da morte \n`
    : `💀 ${defender.nome} está inconsciente! \n`;
    log.push(extexto);
    if (DEBUG) console.log("---");

    return {
        log: log.join('\n'),
        //distChange
    };
}

function getMoveDist(attacker, move) {
    //const tipo = move.tipo;
    const dir = move.direcao;
    const effect = move.EFFECT;
    const mov = attacker.MOV+attacker.modMOV || 0;

    const distChange = dir * (-mov);
    //tipo === 1 ? -mov :
    //tipo === 2 || tipo === 3 ? +mov :
    //tipo === 0 && effect === "FUGA" ? mov * 2 : 0;

    return { distChange };
}

function moveFormulae(a, d, m ) {
    const dd = -d;
    if (DEBUG) console.log("dist reverso: "+dd);
    const fo = stats.total(a, "FOR");
    const ag = stats.total(a, "AGI");
    const it = stats.total(a, "INT");
    const mv = stats.total(a, "MOV");
    const es = stats.total(a, "ESS");
    const si = stats.total(a, "SIN");
    switch (m.tipo) {
        case 1: /*Close (ataca usando mov se necessario) Reduz distancia em MOV
            Acerto: Mod+Agi+Pericia + (Alc - Delta)    Delta = Distancia extra percorrida (acima do MOV) necessária para alcancar o alvo
            Dano: Mod + For + (Dist/2) - RD do adversario Dist= Distancia percorrida para alcancar o alvo (max=Mov) Math.max(0, Math.round(Math.min(mov + dist, mov) / 2))
            Alc: Mod*/
            acerto = m.AC + ag + a[m.pericia] + Math.floor(Math.min((m.ALC + dd),dd/2));
            dano = m.DN + fo + Math.max(0, Math.floor(Math.min(mv + d, mv) / 2));
            desc =    d < 0 ? "se mantendo bem próximo,"
            : d === 0 ? "se aproxima e"
            : d < 3 ? "tenta se aproximar e"
            : "mal conseguindo acompanhar,";

            if (DEBUG) console.log("BonusAcerto:" + m.AC +"+"+ ag +"+"+ a[m.pericia] +"+"+ Math.floor(Math.min((m.ALC + dd),dd/2))+
            " Base Dano:"+ m.DN +"+"+ fo +"+"+  Math.max(0, Math.floor(Math.min(mv + d, mv) / 2)) + " CritMod:" +m.DNCRI);
            break;
        case 2: /*RangeA (recua e ataca) Arco/Arremesso Aumenta distancia em MOV
            Acerto: Mod+Agi+Pericia - (Dist / Int)
            Dano: Mod + For - (Dist - Alc).min0  - RD do adversario
            Alc: Mod+For*/
            acerto = m.AC + ag + a[m.pericia] - Math.floor(Math.max((d - m.ALC), 0) / (it || 1));
            dano = m.DN + fo - Math.max(0, d - (m.ALC + fo));
            desc =    d < 0 ? "não conseguindo se afastar,"
            : d === 0 ? "tenta recuar e"
            : d < 3 ? "recua e"
            : "recua bastante e";

            if (DEBUG) console.log("Bonus Acerto:" + m.AC +"+"+ ag +"+"+ a[m.pericia] +"-"+ Math.floor(Math.max((d - m.ALC), 0) / (it || 1))+
            " Base Dano:"+ m.DN +"+"+ fo +"+"+  Math.max(0, d - (m.ALC + fo)) + " CritMod: " + m.DNCRI + " Alc:" + m.ALC +" Dist:"+ d);
            break;
        case 3: /*RangeB (recua e ataca) Armas de fogo/Bestas  Aumenta distancia em MOV
            Acerto: Mod+AgiPer - (Distancia / Int)
            Dano: Mod - RD do adversario
            Alc: Mod*/
            acerto = m.AC + ag + a[m.pericia] - Math.floor(Math.max((d - m.ALC), 0) / (it || 1));
            dano = m.DN;
            desc =    d < 0 ? "não conseguindo se afastar,"
            : d === 0 ? "tenta recuar e"
            : d < 3 ? "recua e"
            : "recua bastante e";

            if (DEBUG) console.log("Bonus Acerto:" + m.AC +"+"+ ag +"+"+ a[m.pericia] +"-"+ Math.floor(Math.max((d - m.ALC), 0) / (it || 1))+
            " Base Dano:"+ m.DN+ " CritMod: " + m.DNCRI + " Alc:" + m.ALC +" Dist:"+ d);
            break;
        case 4: /* Special (ataque sobrenatural) Não altera distancia
            Acerto: Mod+SinPer - (Distancia / Int)
            Dano: Mod + Ess - RD do adversario
            Alc: Mod*/
            acerto = m.AC + si + a[m.pericia] - Math.floor(Math.max((d - (m.ALC + es)), 0) / (it || 1));
            dano = es + (a.NV * m.DN);
            desc = "";

            if (DEBUG) console.log("Bonus Acerto:" + m.AC +"+"+ si +"+"+ a[m.pericia] +"-"+ Math.floor(Math.max((d - (m.ALC + es)), 0) / (it || 1))+
            " Base Dano:"+ es +"+("+ a.NV +"x"+  m.DN + ") CritMod: " + m.DNCRI + " Alc:" + m.ALC +" Dist:"+ d);
            break;
    }
    switch(m.ELE){
        case "ct": return {acerto , dano , desc, ele: "contundente", ico: "💥"};
        case "cr": return {acerto , dano , desc, ele: "cortante", ico: "💥"};
        case "pn": return {acerto , dano , desc, ele: "penetrante", ico: "💥"};
        case "ch": return {acerto , dano , desc, ele: "chocante", ico: "⚡"};
        case "cg": return {acerto , dano , desc, ele: "congelante", ico: "❄️"};
        case "qm": return {acerto , dano , desc, ele: "queimante", ico: "🔥"};
        case "vt": return {acerto , dano , desc, ele: "vital", ico: "💗"};
        case "ep": return {acerto , dano , desc, ele: "especial", ico: "💠"};
    }
    return { acerto , dano , desc };
}

function roll2d10() {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let total = d1+d2
    if (DEBUG) console.log("roll result:"+ d1+ ","+d2+"("+total+")")
    return { d1, d2, total };
}

function roll1d10() {
    let d3 = Math.floor(Math.random() * 10) + 1;
    if (DEBUG) console.log("extra roll:"+ d3)
    return d3;
}

function formatLootSummary(loot) {
    const grouped = {};

    for (const item of loot) {
        if (!item) continue;
        const name = item.nome;

        if (!grouped[name]) grouped[name] = 0;
        grouped[name]++;
    }

    return Object.entries(grouped)
    .map(([name, qty]) => `+${qty} **${name}**`)
    .join(', ');
}


module.exports = { createCombat, chooseNpcAction, processCombatAction, resolveAttack, roll2d10 };
