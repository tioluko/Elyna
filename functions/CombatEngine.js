const { DEBUG } = require('../config.js');
const { cloneDeep } = require('lodash');
const { generateCombatImageBuffer } = require('../utils/ImageGen.js');
const { db, updateUserData, getMoveById, updateCombat } = require('../utils/db.js');
const { CombatTriggers, hasStatus, removeStatus, addStatus, reduceStatus, getStatusDuration, addDmgTypeEffect } = require('../functions/CombatEffects.js');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { processLootFromNPC, insertToInventory } = require('../functions/LootGen.js');
const { ce, st, cf } = require('../data/locale.js');
const stats = require('./stats');

class CombatEngine {
    constructor(combatId) {
        if (DEBUG) console.time('initial data reading');
        const startMem = process.memoryUsage().heapUsed;


        this.combatId = combatId;

        // Carrega os dados do combate do banco
        const rawcombat = db.prepare('SELECT * FROM combat WHERE id = ?').get(combatId);
        if (!rawcombat) throw new Error(`Combate ${this.combatId} não encontrado.`);

        this.combat = rawcombat;

        // Clona os dados persistidos
        this.player = cloneDeep(JSON.parse(this.combat.user_data));
        this.npc = cloneDeep(JSON.parse(this.combat.npc_data));

        // Garante que STATUS seja array
        //this.player.STATUS = this._normalizeStatus(this.player.STATUS);
        //this.npc.STATUS = this._normalizeStatus(this.npc.STATUS);

        // Inicializa log e estado interno
        //this.log = [];
        this.round = this.combat.round;
        this.result = null;

        if (DEBUG) console.timeEnd('initial data reading'),console.log(`Memória usada: ${((process.memoryUsage().heapUsed - startMem) / 1024 / 1024).toFixed(2)}MB`);
    }

    _normalizeStatus(status) {
        if (typeof status === 'string') {
            try {
                return JSON.parse(status);
            } catch {
                return [];
            }
        }
        return Array.isArray(status) ? status : [];
    }

    ///////////////////////////////////////////////////////////////////////////
    ////////////////////////////Main Proccess Start//////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    // Execução de rodada
    async execute(move) {
        if (DEBUG) console.time('move reading');
        const startMem2 = process.memoryUsage().heapUsed;
        // Reseta log
        this.log = [];
        this.round++;

        const moveId = move.id;
        if (!move) return '❌ Ação inválida.';

        ////////ESCOLHE MOVE DO NPC////////////////////////////////
        const npcAction = this.chooseNpcAction(this.npc);
        const npcMove = npcAction.move;
        if (DEBUG) console.log('[DEBUG] player_move_data:', JSON.stringify(move));
        if (DEBUG) console.log('[DEBUG] npc_move_data:', JSON.stringify(npcAction.move));

        updateCombat(this.combatId, {
            user_action: `move:${moveId}`,
            user_action_data: JSON.stringify(move),
            npc_action: `move:${npcAction.id}`,
            npc_action_data: JSON.stringify(npcMove),
        });
        stats.updateNpc(this.player);
        stats.updateNpc(this.npc)

        if (DEBUG) console.timeEnd('move reading'),console.log(`Memória usada: ${((process.memoryUsage().heapUsed - startMem2) / 1024 / 1024).toFixed(2)}MB`);

        ////////DEFINE DIST////////////////////////////////
        const totalDist = this.getDist(this.player, move, this.npc, npcMove);

        ////////DEFINE ORDEM DE AÇÃO////////////////////////////////
        const order = this.defineTurnOrder(this.player, this.npc, move, npcMove);
        if (DEBUG) console.log("Distância inicial:", this.combat.dist, "Distancia alterada por ações:", totalDist);

        ////////RODADA////////////////////////////////
        for (const [attacker, defender, aMove, dMove] of order) {
            if (defender.PV <= 0) {
                this.log.push(`☠️ ${defender.nome} ${ce.is_unc}, ${attacker.nome} ${ce.wont_act}.`);
                continue;
            }

            const rollAtk = this.roll2d10();
            const rollDef = this.roll2d10();
            const rollPR = hasStatus(attacker, "PR_BOOST")? this.roll1d10() : 0;
            const rollRun = hasStatus(defender, "PR_BOOST")&&hasStatus(defender, "FUGA")? this.roll1d10() : 0;
            const dper = dMove.pericia;

            const effect = aMove.EFFECT || "none";

            const tags = [
                ...JSON.parse(attacker.STATUS || '[]'),
                ...(effect ? [effect] : [])
            ];

            const dtags = [
                ...JSON.parse(defender.STATUS || '[]')
            ];

            this.acerto = 0;
            this.dano = 0;
            this.danofinal = 0;
            this.crit = (rollAtk.d1 === 10 && rollAtk.d2 === 10) ? aMove.DNCRI : 1;
            this.defesa = 0;
            this.foco = "rand";
            this.movtexto = "";
            this.extexto = "";

            ////////DEFINE FORMULAS PADRÕES POR TIPO DE AÇAO//////////////////
            const mods = this.tempMods(attacker, defender);
            const bonus = this.moveFormulae(attacker, totalDist, aMove, mods);
            ////////ESCREVE A SELEÇÃO NO LOG/////////////////////////////////
            this.movtexto = bonus.desc;
            this.log.push(`**${attacker.nome}** ${this.movtexto} `+
            (rollPR > 0 ? ` ${ce.pr_eff}` :"")+
            ` ${ce.use} ${aMove.nome}!`);

            ////////ON ACTION MOVE EFFECT////////////////////////////////
            if (DEBUG) console.log('MOVE EFFECT:', effect);
            for (const tag1 of tags) {this.effectTrigger("onAction", attacker, tag1, this.log)}
            /////////////////////////////////////////////

            /////////////////////////////////////////////
            //Checa se o move é SELF (tipo 0) e skippa tudo daqui até o endround effect
            if (aMove.tipo > 0){
                hitting:{

                this.acerto = rollAtk.total + rollPR + bonus.acerto + mods.acerto - (aMove.tipo === 1 ? (getStatusDuration(defender, "FLY")*2) : 0);
                this.dano = bonus.dano * this.crit;
                this.defesa = stats.total(defender, "RE") + mods.defesa + (defender[dper] || 0);

                //Mostra o ataque utilizado e a forma que foi utilzada
                if (DEBUG) console.log("Ataque:"+ rollAtk.total +"+"+ rollPR +"+"+ bonus.acerto +"+"+ mods.acerto +"-"+ (aMove.tipo === 1 ? (getStatusDuration(defender, "FLY")*2) : 0));
                if (DEBUG) console.log("Dano:"+ bonus.dano +"*"+ this.crit);
                if (DEBUG) console.log("Defesa:"+ stats.total(defender, "RE") +"+"+ mods.defesa +"+"+ (defender[dper]) + "Flying?"+ getStatusDuration(defender, "FLY") );

                /////////////////////////////////////////////////////////////////////
                ////ATTACKER STATUS BEFORE HIT///
                if (DEBUG) console.log('STATUS DO ATTACKER:', attacker.STATUS);
                for (const tag2 of tags) {this.effectTrigger("onHitBefore", attacker, tag2[0], this.log)}
                /////////////////////////////////////////////////////////////////////

                //Mensagem do Roll de acerto
                this.log.push(`🎲 ${ce.hit}: ** ${this.acerto} ** \u2003 *2d10* {[${rollAtk.d1}, ${rollAtk.d2}] + `+
                (rollPR > 0 ? ` *1d10* [${rollPR}] + ` : "")+
                `${this.acerto - (rollAtk.total + rollPR)}}`+
                (this.crit > 1 ? ` 🔥🔥 ***${ce.crit}!!!*** 🔥🔥` : ""));

                //////////////////////////////////////////////
                //Determina a defesa total e checar se tem PR
                const dificuldade = (defender.PR <= 0) ? defender.DEF : rollDef.total + rollRun + this.defesa;
                //////////////////////////////////////
                if (DEBUG) console.log("DEF minima:"+ defender.DEF);
                //Mensagem do Roll de defesa
                this.log.push(defender.PR <= 0
                ? `🚫 ${ce.def}: ** ${dificuldade} **  \u2003 *${ce.no_pr}*`
                :`🎲 ${ce.def}: ** ${dificuldade} ** \u2003 *2d10* {[${rollDef.d1}, ${rollDef.d2}] + `+
                (rollRun > 0 ? ` *1d10* [${rollRun}] + ` : "")+
                `${this.defesa}}`);

                ////Checa se acertou//////////////////////////
                if (this.acerto < dificuldade && this.crit === 1) {
                    this.log.push(` ${attacker.nome} ${ce.miss}❌`);
                    break hitting;
                }
                ////Pega a parte do corpo atingida e RD da mesma///////////////
                const bpRD = this.pickBodyPart(defender, this.foco); //array: 0 nome da var de RD, 1 texto da parte do corpo, 2 modificador de dano
                if (DEBUG) console.log("RD no" + defender[bpRD[1]] +":"+ defender[bpRD[0]]);

                ////Calcula o Dano final e atualiza PV////////
                this.danofinal = Math.max(Math.floor(Math.max(1,this.dano * [bpRD[2]])) - (defender.RD + defender[bpRD[0]] || 0),0);
                defender.PV -= this.danofinal;

                ////Mensagem de dano//////////////
                this.log.push(` **${defender.nome}** ${ce.tk} **${this.danofinal}** ${bonus.ele} ${bpRD[1]} ${bonus.ico}`);

                /////////////////////////////////////////
                ////////ON HIT MOVE EFFECT////////////////////////////////
                if (DEBUG) console.log('HIT EFFECT:', effect);
                for (const tag3 of tags) {this.effectTrigger("onHitEffect", defender, tag3, this.log)}
                /////////////////////////////////////////

                /////////////////////////////////////////
                // DEFENDER STATUS ON HIT
                if (hasStatus(defender, "FUGA")) removeStatus(defender, "FUGA"), this.log.push(`⚠️ **${defender.nome}** ${ce.runfail}`);
                /////////////////////////////////////////
                // HEAVY DAMAGE
                if (Math.floor(this.danofinal >= (stats.total(defender, "RES")*3))) addDmgTypeEffect(defender, aMove.ELE, this.log, 2);
                else if (Math.floor(this.danofinal >= (stats.total(defender, "RES")*2))) addDmgTypeEffect(defender, aMove.ELE, this.log);
                /////////////////////////////////////////

                //////////////////////////////////
                ////Se ultrapassou EQ, perde PR
                if (Math.floor(this.dano * [bpRD[2]]) > defender.EQ) {
                    defender.PR -= 1;
                    this.log.push(`⚠️ **${defender.nome}** ${ce.bal}`);
                }
                //////////////////////////////////

                //////////////////////////////////
                ////////REFLECT DAMAGE EFFECT///////////////////
                if (aMove.tipo === 1 && hasStatus(defender, "ACID")) {
                    if (DEBUG) console.log('REFLECT EFFECT:', defender.STATUS);
                    const acdmg = getStatusDuration(defender, "ACID");
                    attacker.PV -= acdmg;
                    this.log.push(`**${attacker.nome}** ${cf.tk} **${acdmg}** ${cf.acd_dmg}! 🧪`);
                }
                /////////////////////////////////////////
              }
            }
            ////Apply end round effects///////
            for (const tag of tags) {
                if (CombatTriggers.onTurnEnd?.[tag[0]]) {
                    if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
                    CombatTriggers.onTurnEnd[tag[0]](attacker, this.log);
                    if (DEBUG) console.log('RESULTADO:', tag);
                }
            }
            ///////////////////////////////////
            if (defender.PV <= 0) this.log.push(`💀 ${defender.nome} ${ce.is_unc}!`);
            if (attacker.PV <= 0) this.log.push(`💀 ${attacker.nome} ${ce.is_unc}!`);
            this.log.push('\u200B');
            //this.log.push('\n');
            if (DEBUG) console.log("---");
            if (attacker.PV <= 0 || defender.PV <= 0) break;
            if (hasStatus(defender, "FUGA")) this.log.push(`\n💨 **${defender.nome} ${ce.run}!**`);
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

        updateCombat(this.combatId, {
            dist: 0,
            user_action: null,
            npc_action: null,
            user_action_data: null,
            npc_action_data: null,
            user_data: JSON.stringify(this.player),
            npc_data: JSON.stringify(this.npc),
            state: end ? 'ended' : 'waiting',
            round: this.round
        });

        if (end) {
            updateUserData(this.player.id, {
                PV: defeat || draw ? 1 : this.player.PV,
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
                console.log("drops filtrados:"+JSON.stringify(loot));
                await insertToInventory(this.player.id, loot); // Insere
                const lootText = this.formatLootSummary(loot);   // Escreve o log

                // loot = generateLoot(npc); // <- Loot futura aqui?
                this.log.push(`\n🏆 ${ce.vic}! **${this.player.nome}** ${ce.got} **${exp} XP**!`);
                if (loot.length > 0) this.log.push(`\n📦 ${lootText} ${ce.on} ${this.npc.nome}`);
            }
            if (defeat || draw) {this.log.push(`\n⚰️ ${ce.dft}`);}
            else {this.log.push("");}
        }
        return await this.buildResultEmbed(playerDead, npcDead);
    }

    ///////////////////////////////////////////////////////////////////////////
    ////////////////////////////Main Proccess End//////////////////////////////
    ///////////////////////////////////////////////////////////////////////////



    // Escolhe a ação do NPC
    chooseNpcAction(npc) {
        const opts = [
            [npc.move_1, npc.mod_move_1],
            [npc.move_2, npc.mod_move_2],
            [npc.move_3, npc.mod_move_3],
        ].filter(([id]) => id);

        let [id, mods] = opts[Math.floor(Math.random() * opts.length)];
        const PR = npc.PR;
        if (PR > 1 && this.chance(50)){
            npc.PR -= 1;
            addStatus(npc, "PR_BOOST");
        }
        if (PR <= 1 && this.chance(40+(npc.INT*10))){
            return {
                id: 98,
                move:getMoveById(98)
            };
        }
        const selectedMove = getMoveById(id);
        const can_use = stats.handleSkillCost(npc, selectedMove);

        // Fallback para move_1 se não puder pagar
        const fallbackMove = getMoveById(opts[0][0]);
        const move = can_use ? selectedMove : fallbackMove;


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
            id: id,
            move: move
        };
    }


    getDist(attacker, amove, defender, dmove) {
        const adist = amove.direcao * (-(attacker.MOV+attacker.modMOV || 0));
        const ddist = dmove.direcao * (-(defender.MOV+defender.modMOV || 0));
        const totalDist = adist + ddist;
        return totalDist;
    }

    defineTurnOrder (user, npc, userMove, npcMove) {

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

    moveFormulae(a, d, m, mods) {
        const dd = -d;
        if (DEBUG) console.log("dist reverso: "+dd);
        const fo = stats.total(a, "FOR");
        const ag = stats.total(a, "AGI");
        const it = stats.total(a, "INT");
        const mv = stats.total(a, "MOV") + mods.amov;
        const es = stats.total(a, "ESS");
        const si = stats.total(a, "SIN");
        let acerto = 0;
        let dano = 0;
        let desc = "";
        switch (m.tipo) {
            case 0:
                return { acerto , dano , desc };
            case 1: /*Close (ataca usando mov se necessario) Reduz distancia em MOV
                Acerto: Mod+Agi+Pericia + (Alc - Delta)    Delta = Distancia extra percorrida (acima do MOV) necessária para alcancar o alvo
                Dano: Mod + For + (Dist/2) - RD do adversario Dist= Distancia percorrida para alcancar o alvo (max=Mov) Math.max(0, Math.round(Math.min(mov + dist, mov) / 2))
                Alc: Mod*/
                acerto = m.AC + ag + a[m.pericia] + Math.floor(Math.min((m.ALC + dd),dd/4));
                dano = m.DN + fo + Math.max(0, Math.floor(Math.min(mv + d, mv) / 2));
                desc =    d < 0 ? ce.c0
                : d === 0 ? ce.c1
                : d < 3 ? ce.c2
                : ce.c3;

                if (DEBUG) console.log("BonusAcerto:" + m.AC +"+"+ ag +"+"+ a[m.pericia] +"+"+ Math.floor(Math.min((m.ALC + dd),dd/4))+
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

    tempMods(a, d, m ) {
        let acerto = 0;
        let dano = 0;
        let crit = 0;
        let defesa = 0;
        let amov = 0;
        let dmov = 0;

        acerto -= Math.ceil(getStatusDuration(a, "STUN")/3)
        acerto -= Math.ceil(getStatusDuration(a, "NAUSEA")/3)

        defesa -= Math.ceil(getStatusDuration(d, "PARALZ")/3)
        defesa -= Math.ceil(getStatusDuration(d, "NAUSEA")/3)

        amov -= Math.ceil(getStatusDuration(a, "PARALZ")/3)

        dmov -= Math.ceil(getStatusDuration(d, "PARALZ")/3)

        if (DEBUG) console.log("acerto:"+acerto+" dano:"+dano+" crit:"+crit+" defesa:"+defesa+" amov:"+amov+" dmov:"+dmov);
        return { acerto , dano , crit, defesa, amov, dmov };
    }

    effectTrigger(trigger, entity, tag, log){
        if (CombatTriggers[trigger]?.[tag]) {
            if (DEBUG) console.log('ATIVANDO TRIGGER:', tag);
            const eff = CombatTriggers[trigger][tag](entity, log);
            if (DEBUG) console.log('RESULTADO:', eff);
            if (eff) {
                for (const key in eff) {
                    if (key === 'consome') continue; // trata depois

                    if (typeof this[key] === 'number') this[key] += eff[key];
                    else this[key] = eff[key];
                }
                if (eff?.consome) {
                    removeStatus(entity, tag);
                }
            }
        }
    }


    pickBodyPart(u, f) {
        let filtered = [];
        if (f === "rand"){
            const options = ["cb", "tr", "tr", "tr", "tr", "tr", "bd", "be", "pd", "pe"].filter(Boolean);
            if (u.exBdpart1 !== "none") options.push("e1");
            if (u.exBdpart2 !== "none") options.push("e2");
            //if (u.exBdpart3 !== "none") options.push("e3");
            //if (u.exBdpart4 !== "none") options.push("e4");//just in case....
            filtered = options.filter(opt => u["RD" + opt] !== null);
        }
        const part = f !== "rand" ? f : filtered[Math.floor(Math.random() * filtered.length)];

        if (DEBUG) console.log(f +" -> "+ part);
        switch (part) {
            case "cb": return [ "RD"+part , `in the head`, 1.5];
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

    roll2d10() {
        let d1 = Math.floor(Math.random() * 10) + 1;
        let d2 = Math.floor(Math.random() * 10) + 1;
        let total = d1+d2
        if (DEBUG) console.log("roll result:"+ d1+ ","+d2+"("+total+")")
            return { d1, d2, total };
    }

    roll1d10() {
        let d3 = Math.floor(Math.random() * 10) + 1;
        if (DEBUG) console.log("extra roll:"+ d3)
            return d3;
    }

    chance(percent) {
        // Returns true with the given percent chance (0-100)
        return Math.random() * 100 < percent;
    }

    async buildResultEmbed(playerDead, npcDead) {
        const imageBuffer = await generateCombatImageBuffer(this.player.image, this.npc.image, playerDead, npcDead);
        //const file = new AttachmentBuilder(imageBuffer, { name: 'vs.png' });
        const file = imageBuffer
        ? new AttachmentBuilder(imageBuffer, { name: 'vs.png' })
        : null;
        const logs = Array.isArray(this.log) ? this.log : [this.log];

        const embed = new EmbedBuilder()
        .setTitle(`⚔️ __**${this.player.nome}**__ \u2003x\u2003 __**${this.npc.nome}**__ ⚔️ `)
        .setImage('attachment://vs.png')
        .setDescription(this.log.join('\n'))
        .setFooter({text:`Round: ${this.round}`})
        .addFields(
            { name: '\u200B', value: stats.barCreate(this.player,"PV")+'\u2003 '+stats.barCreate(this.npc,"PV")+'\n'+
                stats.barCreate(this.player,"PM")+'\u2003 '+stats.barCreate(this.npc,"PM")+'\n'+
                stats.barCreate(this.player,"PR")+'\u2003 '+stats.barCreate(this.npc,"PR"), inline: true });

        return { embeds: [embed], files: file ? [file] : [] };
    }

    formatLootSummary(loot) {
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

    // Salva estado de volta no banco após execução
    save() {
        db.prepare('UPDATE combat SET user_data = ?, npc_data = ? WHERE id = ?')
        .run(JSON.stringify(this.player), JSON.stringify(this.npc), this.combatId);
    }
}

module.exports = CombatEngine;
