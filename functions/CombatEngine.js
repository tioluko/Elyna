const { cloneDeep } = require('lodash');
const { db, updateCombat } = require('../utils/db.js');
const { hasStatus, getStatusDuration } = require('./CombatEffects');
const stats = require('./stats');
const generateCombatImageBuffer = require('./ImageGen');

class CombatEngine {
    constructor(player, npc, combatData) {
        if (DEBUG) console.time('initial data reading');
        const startMem = process.memoryUsage().heapUsed;

        this.player = cloneDeep(player);
        this.npc = cloneDeep(npc);
        this.combat = combatData;
        this.log = [];
        this.imageBuffer = null;
    }

    async execute(playerActionData) {
        if (DEBUG) console.log(this.player, this.npc)
        if (!this.combat || this.combat.state !== 'waiting') return '⚠️ Combate não encontrado ou em estado inválido.';

        const npcAction = this.chooseNpcAction(this.npc);
        const npcActionData = npcAction.move
        if (DEBUG) console.log("npc action:", npcAction)

        //this.applyTurnStartEffects();
        ///////////Round Start//////////////
        if (DEBUG) console.log("valor de PR dentro da função:", pr)
        if (pr) addStatus(this.player, "PR_BOOST");
        //////////////////////////////////// <-melhorar isso

        updateCombat(combateId, {
            user_action: `move:${playerActionData.id}`,
            user_action_data: JSON.stringify(playerActionData),
            npc_action: `move:${npcAction.id}`,
            npc_action_data: npcActionData
        });

        stats.updateNpc(this.player);
        stats.updateNpc(this.npc);

        if (DEBUG) console.timeEnd('initial data reading'),console.log(`Memória usada: ${((process.memoryUsage().heapUsed - startMem) / 1024 / 1024).toFixed(2)}MB`);

        const totalDist = this.getDist(this.player, playerActionData, this.npc, npcActionData);
        if (DEBUG) console.log("Distancia alterada por ações:", totalDist);

        const order = this.defineTurnOrder(this.player, this.npc, playerActionData, npcActionData);
        if (DEBUG) console.log("Distância inicial:", this.combat.dist);

        for (const [attacker, defender, dMove, dMove] of order) {
            if (target.PV <= 0) {
                log.push(`☠️ ${defender.nome} ${ce.is_unc}, ${actor.nome} ${ce.wont_act}.`);
                continue;
            }

            const tags = [
                ...JSON.parse(attacker.STATUS || '[]'),
                ...(effect ? [effect] : [])
            ];
            const rollAtk = roll2d10();
            const rollDef = roll2d10();
            const rollPR = hasStatus(attacker, "PR_BOOST")? roll1d10() : 0;
            const rollRun = hasStatus(defender, "PR_BOOST")&&hasStatus(defender, "FUGA")? roll1d10() : 0;
            const effect = move.EFFECT || "none";
            let acerto = 0;
            let dano = 0;
            let danofinal = 0;
            let crit = (rollAtk.d1 === 10 && rollAtk.d2 === 10) ? move.DNCRI : 1;
            let defesa = stats.total(defender, "RE") + (defender[defpericia] || 0);
            let foco = "rand";
            let movtexto = "";
            let extexto = "";

            if (DEBUG) console.log('MOVE EFFECT:', effect);

            for (const tag of tags) { this.effectTrigger("onAction", attacker, tag, log) }

            //Mensagem do move selecionado
            log.push(`**${attacker.nome}** ${movtexto} `+
            (rollPR > 0 ? ` ${ce.pr_eff}` :"")+
            ` ${ce.use} ${move.nome}!`);

            if (move.tipo > 0){
                const bonus = this.moveFormulae(attacker, dist, move);
                //const bonus = moveFormulae.bonus
                //const penalty = moveFormulae.penalty (fazer assim depois?)
                if (DEBUG) console.log("Flying opponent?"+ getStatusDuration(defender, "FLY"));
                acerto = rollAtk.total + rollPR + bonus.acerto - (move.tipo === 1 ? (getStatusDuration(defender, "FLY")*2) : 0);
                dano = bonus.dano * crit;
                movtexto = bonus.desc;

                if (DEBUG) console.log("BonusDefesa:"+ stats.total(defender, "RE") +"+"+ (defender[defpericia]));

                for (const tag of tags) { this.effectTrigger("onHitBefore", attacker, tag[0], log) }

                //Mensagem do Roll de acerto
                log.push(`🎲 ${ce.hit}: ** ${acerto} ** \u2003 *2d10* {[${rollAtk.d1}, ${rollAtk.d2}] + `+
                (rollPR > 0 ? ` *1d10* [${rollPR}] + ` : "")+
                `${acerto - (rollAtk.total + rollPR)}}`+
                (crit > 1 ? ` 🔥🔥 ***${ce.crit}!!!*** 🔥🔥` : ""));

                //////////////////////////////////////////////
                //Determina a defesa total e checar se tem PR
                const dificuldade = (defender.PR <= 0) ? defender.DEF : rollDef.total + rollRun + defesa;
                //////////////////////////////////////
                if (DEBUG) console.log("DEF minima:"+ defender.DEF);
                //Mensagem do Roll de defesa
                log.push(defender.PR <= 0
                ? `🚫 ${ce.def}: ** ${dificuldade} **  \u2003 *${ce.no_pr}*`
                :`🎲 ${ce.def}: ** ${dificuldade} ** \u2003 *2d10* {[${rollDef.d1}, ${rollDef.d2}] + `+
                (rollRun > 0 ? ` *1d10* [${rollRun}] + ` : "")+
                `${defesa}}`);

                if (acerto < dificuldade && crit === 1) {
                    log.push(` ${attacker.nome} ${ce.miss}❌`);
                    if (hasStatus(defender, "FUGA")) {
                        log.push(`\n💨 **${defender.nome} ${ce.run}!**`);
                        break;
                        }
                    log.push('\n');
                    continue;
                }
                // 🎯 Acertou

                ////Pega a parte do corpo atingida e RD da mesma///////////////
                const bpRD = this.pickBodyPart(defender, foco); //array: 0 nome da var de RD, 1 texto da parte do corpo, 2 modificador de dano
                if (DEBUG) console.log("RD no" + defender[bpRD[1]] +":"+ defender[bpRD[0]]);

                ////Calcula o Dano final e atualiza PV////////
                danofinal = Math.max(Math.floor(Math.max(1,dano * [bpRD[2]])) - (defender.RD + defender[bpRD[0]] || 0),0);
                defender.PV -= danofinal;

                ////Mensagem de dano//////////////
                log.push(` **${defender.nome}** ${ce.tk} **${danofinal}** ${bonus.ele} ${bpRD[1]} ${bonus.ico}`);

                for (const tag of tags) { this.effectTrigger("onHitEffect", defender, tag, log) }

                /////////////////////////////////////////
                // DEFENDER STATUS ON HIT
                if (hasStatus(defender, "FUGA")) removeStatus(defender, "FUGA"), log.push(`⚠️ **${defender.nome}** ${ce.runfail}`);
                /////////////////////////////////////////
                // HEAVY DAMAGE
                if (Math.floor(danofinal >= (stats.total(defender, "RES")*3))) addDmgTypeEffect(defender, move.ELE, log, 2);
                else if (Math.floor(danofinal >= (stats.total(defender, "RES")*2))) addDmgTypeEffect(defender, move.ELE, log);
                /////////////////////////////////////////

                ////Se ultrapassou EQ, perde PR
                if (Math.floor(dano * [bpRD[2]]) > defender.EQ) {
                    defender.PR -= 1;
                    log.push(`⚠️ **${defender.nome}** ${ce.bal}`);
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
            ///////////////////////////////////
            if (defender.PV <= 0) log.push(`💀 ${defender.nome} ${ce.is_unc}!`);
            if (attacker.PV <= 0) log.push(`💀 ${attacker.nome} ${ce.is_unc}!`);
            log.push('\u200B');
            log.push('\n');
            if (DEBUG) console.log("---");
            if (target.PV <= 0) break;
        }

        ///Check if the battle is over//////
        const end = this.player.PV <= 0 || this.npc.PV <= 0 || hasStatus(this.player, "FUGA") ;
        if (DEBUG) console.log(end);
        const defeat = this.player.PV <= 0 && this.npc.PV > 0;
        const draw = this.player.PV <= 0 && this.npc.PV <= 0;
        const win = this.player.PV > 0 && this.npc.PV <= 0;
        const playerDead = this.player.PV <= 0;
        const npcDead = this.npc.PV <= 0;
        ///////////////////////////////////

        updateCombat(combateId, {
            dist: 0,
            user_action: null,
            npc_action: null,
            user_action_data: null,
            npc_action_data: null,
            user_data: JSON.stringify(this.player),
            npc_data: JSON.stringify(this.npc),
            state: end ? 'ended' : 'waiting'
        });

        if (end) {
            updateUserData(this.player.id, {
                PV: this.player.PV,
                PM: this.player.PM,
                PR: this.player.MPR,
                //STATUS: end ? "none" : user.STATUS,
                EVENT: "none"
            });
            let exp = 0;
            let loot = [];
            if (win) {
                exp = this.npc.NV || 1;
                stats.addxp(this.player, exp);

                const loot = processLootFromNPC(this.npc); // <- captura resultado
                await insertToInventory(this.player.id, loot); // Insere
                const lootText = formatLootSummary(loot);   // Escreve o log

                // loot = generateLoot(npc); // <- Loot futura aqui?
                result.log += `\n🏆 ${ce.vic}! **${this.player.nome}** ${ce.got} **${exp} XP**!`;
                if (loot !== null) result.log += `\n📦 ${lootText} ${ce.on} ${this.npc.nome}`;
            }
            if (defeat || draw) {result.log += `\n⚰️ ${ce.dft}`;}
            else {result.log += ``;}
        }

        const playerDead = this.player.PV <= 0;
        const npcDead = this.npc.PV <= 0;

        return this.buildResultEmbed(playerDead, npcDead);

    }

    chooseNpcAction(npc) { //Ainda é random.  AI viria aqui futuramente
        const opts = [
            [npc.move_1, npc.mod_move_1],
            [npc.move_2, npc.mod_move_2],
            [npc.move_3, npc.mod_move_3],
        ].filter(([id]) => id);

        const [id, mods] = opts[Math.floor(Math.random() * opts.length)];
        const move = getMoveById(id);
        if (npc.PR > 1){
            npc.PR -= 1;
            addStatus(npc, "PR_BOOST");
        }

        if (mods) {
            try {
                const movemods = mods ? JSON.parse(mods) : null;
                for (const key in movemods) {
                    if (key in move && typeof move[key] === 'number') {
                        move[key] += movemods[key];
                    }
                }
            } catch (err) {
                console.warn(`[⚠️ NPC MODS] Erro ao aplicar mods em ${id}:`, err.message);
            }
        }
        return {
            move: JSON.stringify(move),
            id: id,
        };
    }

    getDist(attacker, amove, defender, dmove) {
        const adist = amove.direcao * (-(attacker.MOV+attacker.modMOV || 0));
        const ddist = dmove.direcao * (-(defender.MOV+defender.modMOV || 0));
        const totalDist = adist + ddist;
        return totalDist;
    }

    defineTurnOrder (user, npc, userMove, npcMove) {
                      *
        console.log(hasStatus(user, "STUN"));
        if (DEBUG) console.log("Move ini bonus:",userMove.INI);
        const playerIni = (stats.total(user, "RE") + Number(userMove.INI || 0) - (hasStatus(user, "STUN") ? Math.ceil(getStatusDuration(user, "STUN")/2) : 0 ));
        const npcIni = (stats.total(npc, "RE") + Number(npcMove.INI || 0)  - (hasStatus(npc, "STUN") ? Math.ceil(getStatusDuration(npc, "STUN")/2) : 0 ))
        const order = playerIni >= npcIni || (userMove.EFFECT === "FUGA")
        ? [[user, npc, userMove, npcMove], [npc, user, npcMove, userMove]]
        : [[npc, user, npcMove, userMove], [user, npc, userMove, npcMove]];

        if (DEBUG) console.log("Iniciativas (player/npc):"+ (stats.total(user, "RE") + Number(userMove.INI || 0)) +"("+playerIni+") ,"+(stats.total(npc, "RE") + Number(npcMove.INI || 0)) +"("+npcIni+")");

        return order;
    }

    effectTrigger (trigger, entity, tag, log) {
        if (CombatTriggers.trigger?.[tag]) {
            if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
            const eff = CombatTriggers.trigger[tag](attacker, log);
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
                if (eff?.consome) removeStatus(attacker, tag[0]);
                if (eff?.break) return {
                    log: log.join('\n'),
                };
            }
        }
    }

    moveFormulae(a, d, m ) {
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
                desc =    d < 0 ? ce.c0
                : d === 0 ? ce.c1
                : d < 3 ? ce.c2
                : ce.c3;

                if (DEBUG) console.log("BonusAcerto:" + m.AC +"+"+ ag +"+"+ a[m.pericia] +"+"+ Math.floor(Math.min((m.ALC + dd),dd/2))+
                    " Base Dano:"+ m.DN +"+"+ fo +"+"+  Math.max(0, Math.floor(Math.min(mv + d, mv) / 2)) + " CritMod:" +m.DNCRI);
            break;
            case 2: /*RangeA (recua e ataca) Arco/Arremesso Aumenta distancia em MOV
                Acerto: Mod+Agi+Pericia - (Dist / Int)
                Dano: Mod + For - (Dist - Alc).min0  - RD do adversario
                Alc: Mod+For*/
                acerto = m.AC + ag + a[m.pericia] - Math.floor(Math.max((d - m.ALC), 0) / (it || 1));
                dano = m.DN + fo - Math.max(0, d - (m.ALC + fo));
                desc =    d < 0 ? ce.r0
                : d === 0 ? ce.r1
                : d < 3 ? ce.r2
                : ce.r3;

                if (DEBUG) console.log("Bonus Acerto:" + m.AC +"+"+ ag +"+"+ a[m.pericia] +"-"+ Math.floor(Math.max((d - m.ALC), 0) / (it || 1))+
                    " Base Dano:"+ m.DN +"+"+ fo +"+"+  Math.max(0, d - (m.ALC + fo)) + " CritMod: " + m.DNCRI + " Alc:" + m.ALC +" Dist:"+ d);
            break;
            case 3: /*RangeB (recua e ataca) Armas de fogo/Bestas  Aumenta distancia em MOV
                Acerto: Mod+AgiPer - (Distancia / Int)
                Dano: Mod - RD do adversario
                Alc: Mod*/
                acerto = m.AC + ag + a[m.pericia] - Math.floor(Math.max((d - m.ALC), 0) / (it || 1));
                dano = m.DN;
                desc =    d < 0 ? ce.r0
                : d === 0 ? ce.r1
                : d < 3 ? ce.r2
                : ce.r3;

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
            case "ct": return {acerto , dano , desc, ele: st.ctdmg, ico: "💥"};
            case "cr": return {acerto , dano , desc, ele: st.crdmg, ico: "💥"};
            case "pn": return {acerto , dano , desc, ele: st.pndmg, ico: "💥"};
            case "ch": return {acerto , dano , desc, ele: st.chdmg, ico: "⚡"};
            case "cg": return {acerto , dano , desc, ele: st.cgdmg, ico: "❄️"};
            case "qm": return {acerto , dano , desc, ele: st.qmdmg, ico: "🔥"};
            case "vt": return {acerto , dano , desc, ele: st.vtdmg, ico: "💗"};
            case "ep": return {acerto , dano , desc, ele: st.epdmg, ico: "💠"};
        }
        return { acerto , dano , desc };
    }

    pickBodyPart(u, f) {
        if (f === "rand"){
            const options = ["cb", "tr", "tr", "tr", "tr", "tr", "bd", "be", "pd", "pe"].filter(Boolean);
            if (u.exBdpart1 !== "none") options.push("e1");
            if (u.exBdpart2 !== "none") options.push("e2");
            //if (u.exBdpart3 !== "none") options.push("e3");
            //if (u.exBdpart4 !== "none") options.push("e4");//just in case....
            const filtered = options.filter(opt => u["RD" + opt] !== null);
        }
        const part = f !== "rand" ? f : filtered[Math.floor(Math.random() * filtered.length)];

        if (DEBUG) console.log(filtered);
        switch (rand) {
            case "cb": return [ "RD"+part , `in the head`, 2];
            case "tr": return [ "RD"+part , `in the body`, 1];
            case "bd": return [ "RD"+part , `in the right arm`, 0.5];
            case "be": return [ "RD"+part , `in the left arm`, 0.5];
            case "pd": return [ "RD"+part , `in the right leg`, 0.5];
            case "pe": return [ "RD"+part , `in the left leg`, 0.5];
            case "e1": return [ "RD"+part , `in its ${u.exBdpart1}`, 0.5];
            case "e2": return [ "RD"+part , `in its ${u.exBdpart2}`, 0.5];
            //case "e3": return [ "RD"+part , "na " + u.exBdpart3, 0.5];
            //case "e4": return [ "RD"+part , "na " + u.exBdpart4, 0.5];//just in case....
        }
    }

    buildResultEmbed(playerDead, npcDead) {
        const file = new AttachmentBuilder(this.imageBuffer, { name: 'vs.png' });

        const embed = new EmbedBuilder()
        .setTitle(`⚔️ __**${user.nome}**__ \u2003x\u2003 __**${npc.nome}**__ ⚔️ `)
        .setImage('attachment://vs.png')
        .setDescription(result.log)
        .addFields(
            { name: '\u200B', value: stats.barCreate(player,"PV")+'\u2003 '+stats.barCreate(npc,"PV")+'\n'+
                stats.barCreate(player,"PM")+'\u2003 '+stats.barCreate(npc,"PM")+'\n'+
                stats.barCreate(player,"PR")+'\u2003 '+stats.barCreate(npc,"PR"), inline: true });

        return { embeds: [embed], files: [file] };
    }
}

module.exports = CombatEngine;
