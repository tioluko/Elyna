const { DEBUG } = require('../config.js');
const { total } = require('./stats');
const { cf } = require('../data/locale.js');
/*
 * cortante > sangramento
 * penetrante > sangramento
 * contundente > atordoamento
 * chocante > paralisia
 * queimante > exaustão
 * congelante > paralisia
 * vital > enjoo
 *
 * sangramento x > x dano ao agir
 * incendiado x > x dano ao agir
 * atordoamento x > -x*2 em ini x em acerto
 * exaustão x > -x em acerto e mov
 * paralisia x > -x em reação e mov
 * enjoo x > -x em acerto e reação
 */
const CombatTriggers = {

    ///USER STATUS CHECK
    onTurnStart: {
        HOLD: (attacker, defender, log) => {
            console.log("Hold at round start:",getStatusDuration(attacker, "HOLD"));
            reduceStatus(attacker, "HOLD");
            if (!hasStatus(attacker, "HOLD")) log.push(`**${attacker.nome}** ${cf.no_imb}`);
            else {
                const dt = 10 + Math.ceil(getStatusDuration(attacker, "HOLD")/2);
                const stat = total(attacker, "FOR")
                const roll = r2d10();
                const result = roll.total + stat;
                log.push(`🎲 ${cf.strroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

                if (result >= dt) {
                    log.push(`**${attacker.nome}** ${cf.imb_res}`);
                    removeStatus(attacker, "HOLD");
                    console.log("Hold after round:",getStatusDuration(attacker, "HOLD"));
                    return;
                }else log.push(`**${attacker.nome}** ${cf.is_imb}`);
            }
            console.log("Hold after round:",getStatusDuration(attacker, "HOLD"));
            return;
        }
    },
    onTurnEnd: {
        NAT_REGEN: (attacker, defender, log) => {
            const dmg = getStatusDuration(attacker, "NAT_REGEN");
            console.log("regen:", dmg)
            attacker.PV += dmg;
            log.push(`**${attacker.nome}** ${cf.rest} **${dmg}** ${cf.pv} 💖`);
            return;
        },
        REGEN: (attacker, defender, log) => {
            const dmg = attacker.NV;
            console.log("regen:", dmg)
            attacker.PV += dmg;
            reduceStatus(attacker, "REGEN"); // reduz 1 turno
            log.push(`**${attacker.nome}** ${cf.rest} **${dmg}** ${cf.pv} 💖`);
            return;
        },
        POISON: (attacker, defender, log) => {
            const dmg = Math.ceil(getStatusDuration(attacker, "POISON")/6);
            console.log("poison power:", dmg)
            attacker.PV -= dmg;
            reduceStatus(attacker, "POISON"); // reduz 1 turno
            log.push(`**${attacker.nome}** ${cf.tk} **${dmg}** ${cf.psn_dmg}! 🤢`);
            if (!hasStatus(attacker, "POISON")) log.push(`**${attacker.nome}** ${cf.no_psn}`);
            return;
        },
        BLEED: (attacker, defender, log) => {
            const dmg = Math.ceil(getStatusDuration(attacker, "BLEED")/5);
            console.log("bleed power:", dmg)
            attacker.PV -= dmg;
            reduceStatus(attacker, "BLEED"); // reduz 1 turno
            log.push(`**${attacker.nome}** ${cf.tk} **${dmg}** ${cf.bld_dmg}! 🩸`);
            if (!hasStatus(attacker, "BLEED")) log.push(`**${attacker.nome}** ${cf.no_bld}`);
            return;
        },
        BURN: (attacker, defender, log) => {
            const dmg = Math.ceil(getStatusDuration(attacker, "BURN")/7);
            console.log("burn power:", dmg)
            attacker.PV -= dmg;
            reduceStatus(attacker, "BURN"); // reduz 1 turno
            log.push(`**${attacker.nome}** ${cf.tk} **${dmg}** ${cf.brn_dmg}! 🔥`);
            if (!hasStatus(attacker, "BURN")) log.push(`**${attacker.nome}** ${cf.no_brn}`);
            return;
        },
        STUN: (attacker, defender, log) => {
            console.log("Stun at round start:",getStatusDuration(attacker, "STUN"));
            reduceStatus(attacker, "STUN");
            console.log("Stun after round:",getStatusDuration(attacker, "STUN"));
            if (!hasStatus(attacker, "STUN")) log.push(`**${attacker.nome}** ${cf.no_stn}`);
            return;
        },
        PARALZ: (attacker, defender, log) => {
            console.log("Paralz at round start:",getStatusDuration(attacker, "PARALZ"));
            reduceStatus(attacker, "PARALZ");
            console.log("Paralz after round:",getStatusDuration(attacker, "PARALZ"));
            if (!hasStatus(attacker, "PARALZ")) log.push(`**${attacker.nome}** ${cf.no_plz}`);
            return;
        },
        NAUSEA: (attacker, defender, log) => {
            console.log("Nausea at round start:",getStatusDuration(attacker, "NAUSEA"));
            reduceStatus(attacker, "NAUSEA");
            console.log("Nausea after round:",getStatusDuration(attacker, "NAUSEA"));
            if (!hasStatus(attacker, "NAUSEA")) log.push(`**${attacker.nome}** ${cf.no_nau}`);
            return;
        }/*,
        GUARD: (attacker, defender, log) => {
            removeStatus(defender, "GUARD");
            console.log("Removing GUARD status");
            return;
        }*/
    },


    ///MOVE STATUS CHECK
    onAction: {
        REC_PR: (attacker, defender, log) => {
            const max = attacker.MPR || 0;
            const rec = Math.floor(max / 2);
            attacker.PR = Math.min(attacker.PR + rec, max);
            //log.push(`**${attacker.nome}** ${cf.reb} ${cf.rest} **${rec}** ${cf.pr} ✨`);
            return{
                extexto: `\n**${attacker.nome}** ${cf.rest} **${rec}** ${cf.pr} ✨`
            };
        },
        REC_PV_MAG: (attacker, defender, log) => {
            const max = attacker.MPV || 0;
            const rec = total(attacker, "ESS") + (attacker.NV * 2);
            attacker.PV = Math.min(attacker.PV + rec, max);
            if (hasStatus(attacker, "BLEED")) reduceStatus(attacker, "BLEED", attacker.NV);
            //log.push(`**${attacker.nome}** ${cf.rest} **${rec}** ${cf.pv} 💖`);
            return{
                extexto: `**${attacker.nome}** ${cf.rest} **${rec}** ${cf.pv} 💖`
            };
        },
        REC_PV_NAT: (attacker, defender, log) => {
            const max = attacker.MPV || 0;
            const rec = total(attacker, "RES")* 2;
            attacker.PV = Math.min(attacker.PV + rec, max);
            if (hasStatus(attacker, "BLEED")) reduceStatus(attacker, "BLEED", attacker.NV);
            //log.push(`**${attacker.nome}** ${cf.rest} **${rec}** ${cf.pv} 💖`);
            return {
                extexto: `**${attacker.nome}** ${cf.rest} **${rec}** ${cf.pv} 💖`
            };
        },
        FUGA: (attacker, defender, log) => {
            addStatus(attacker, "FUGA");
            //log.push(`**${attacker.nome}** ${cf.running}!`);
            return {
                extexto: `\n**${attacker.nome}** ${cf.running}`
            };
        },
        GUARD: (attacker, defender, log) => {
            addStatus(attacker, "GUARD");
            //log.push(`**${attacker.nome}** ${cf.guard}!`);
            return{
                extexto: `\n**${attacker.nome}** ${cf.guard}!`
            };
        }
    },

    onHitBefore: {
        FOCUScb: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando na cabeça");
            return {
                foco: String("cb"),
                consome: true };
        },
        FOCUStr: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando no tronco");
            return {
                foco: "tr",
                consome: true };
        },
        FOCUSbd: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando no braço d");
            return {
                foco: "bd",
                consome: true };
        },
        FOCUSbe: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando no braço e");
            return {
                foco: "be",
                consome: true };
        },
        FOCUSpd: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando na perna d");
            return {
                foco: "pd",
                consome: true };
        },
        FOCUSpe: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando na perna e");
            return {
                foco: "pe",
                consome: true };
        },
        FOCUSe1: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando em e1");
            return {
                foco: "e1",
                consome: true };
        },
        FOCUSe2: (attacker, defender, log) => {
            if (DEBUG) console.log("Mirando em e2");
            return {
                foco: "e2",
                consome: true };
        },
        PR_BOOST: (attacker, defender, log) => {
            if (DEBUG) console.log("Pr boost ativado");
            return {
                consome: true };
        },
        BLITZ: (attacker, defender, log) => {
            if (DEBUG) console.log("Blitz ativado");
            log.push(cf.blitz);
            return {
                acerto: 10,
                consome: true };
        }
    },

    onHitEffect: {
        HOLD: (acerto, defender, log) => {
            const dt = acerto;
            const stat = total(defender, "FOR");
            const roll = r2d10();
            const result = roll.total + stat;
            log.push(`🎲 ${cf.strroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

            if (result >= dt) {
                log.push(`**${defender.nome}** ${cf.imb_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "HOLD") ? `${cf.add_imb}` : `${cf.is_imb}`));
                addStatus(defender, "HOLD", ( hasStatus(defender, "HOLD") ? Math.min(1+dt-result, 4) : 1+dt-result));
                //addStatus(defender, "HOLD", (1+dt-result));
                return;
            }
        },
        WEB: (acerto, defender, log) => {
            const dt = acerto;
            const stat = total(defender, "FOR")
            const roll = r2d10();
            const result = roll.total + stat;
            log.push(`🎲 ${cf.strroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

            if (result >= dt) {
                log.push(`**${defender.nome}** ${cf.web_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "HOLD") ? `${cf.add_imb}` : `${cf.is_imb}`));
                addStatus(defender, "HOLD", ( hasStatus(defender, "HOLD") ? Math.min(1+dt-result, 4) : 1+dt-result));
                //addStatus(defender, "HOLD", (1+dt-result));
                return;
            }
        },
        NET1: (acerto, defender, log) => {
            const dt = acerto;
            const stat = total(defender, "FOR");
            const roll = r2d10();
            const result = roll.total + stat;
            log.push(`🎲 ${cf.strroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

            if (result >= dt) {
                log.push(`**${defender.nome}** ${cf.imb_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "HOLD") ? `${cf.add_imb}` : `${cf.is_imb}`));
                addStatus(defender, "HOLD", ( hasStatus(defender, "HOLD") ? 4 : 10));
                //addStatus(defender, "HOLD", (1+dt-result));
                return;
            }
        },
        POISON: (attacker, defender, log) => {
            const dt = 15;
            const stat = total(defender, "RES")
            const roll = r2d10();
            const result = roll.total + stat;
            log.push(`🎲 ${cf.resroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

            if (result >= dt || !canEffect(defender, "POISON")) {
                log.push(`**${defender.nome}** ${cf.psn_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "POISON") ? `${cf.add_psn}` : `${cf.is_psn}`));
                addStatus(defender, "POISON", (1+dt-result));
                return;
            }
        },
        POISON2: (attacker, defender, log) => {
            const dt = 20;
            const dt2 = 15;
            const stat = total(defender, "RES")
            const roll = r2d10();
            const result = roll.total + stat;
            log.push(`🎲 ${cf.resroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DTs:**${dt},${dt2}**`);

            if (result >= dt || !canEffect(defender, "POISON")) {
                log.push(`**${defender.nome}** ${cf.psn_res}`);
                return;
            }else if (result >= dt2){
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "POISON") ? `${cf.add_psn}` : `${cf.is_psn}`));
                addStatus(defender, "POISON", (2+dt-result));
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "POISON") ? `${cf.add_psn}` : `${cf.is_psn}`));
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "PARALZ") ? `${cf.add_plz}` : `${cf.is_plz}`));
                addStatus(defender, "POISON", (2+dt-result));
                addStatus(defender, "PARALZ", (2+dt2-result));
                return;
            }
        },
        MPOISON: (acerto, defender, log) => {
            const dt = acerto;
            const result = total(defender, "GM")

            if (result >= dt || !canEffect(defender, "POISON")) {
                log.push(`**${defender.nome}** ${cf.psn_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "POISON") ? `${cf.add_psn}` : `${cf.is_psn}`));
                addStatus(defender, "POISON", (1+dt-result));
                return;
            }
        },
        NAUSEA: (attacker, defender, log) => {
            const dt = 15;
            const stat = total(defender, "RES")
            const roll = r2d10();
            const result = roll.total + stat;
            log.push(`🎲 ${cf.resroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

            if (result >= dt || !canEffect(defender, "NAUSEA")) {
                log.push(`**${defender.nome}** ${cf.nau_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "NAUSEA") ? `${cf.add_nau}` : `${cf.is_nau}`));
                addStatus(defender, "NAUSEA", (1+dt-result));
                return;
            }
        },
        MNAUSEA: (acerto, defender, log) => {
            const dt = acerto;
            const result = total(defender, "GM")

            if (result >= dt || !canEffect(defender, "NAUSEA")) {
                log.push(`**${defender.nome}** ${cf.nau_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "NAUSEA") ? `${cf.add_nau}` : `${cf.is_nau}`));
                addStatus(defender, "NAUSEA", (1+dt-result));
                return;
            }
        },
        BURN: (attacker, defender, log) => {

            if (result >= dt || !canEffect(defender, "BURN")) {
                log.push(`**${defender.nome}** ${cf.brn_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "BURN") ? `${cf.add_brn}` : `${cf.is_brn}`));
                addStatus(defender, "BURN", (5));
                return;
            }
        },
        BURN2: (attacker, defender, log) => {

            if (result >= dt || !canEffect(defender, "BURN")) {
                log.push(`**${defender.nome}** ${cf.brn_res}`);
                return;
            }else {
                log.push (`⚠️ **${defender.nome}** `+ (hasStatus(defender, "BURN") ? `${cf.add_brn}` : `${cf.is_brn}`));
                addStatus(defender, "BURN", (15));
                return;
            }
        },
        BLEED: (attacker, defender, log) => {
            defender.PV -= 2;
            log.push(`🩸 Sofreu 2 de dano por sangramento!`);
        }
    }
};

function hasStatus(entity, tag) {
    const status = JSON.parse(entity.STATUS || '[]');
    return status.some(([t]) => t === tag);
}

function getStatusDuration(entity, tag) {
    const status = JSON.parse(entity.STATUS || '[]');
    const entry = status.find(([t]) => t === tag);
    return entry ? entry[1] : 0;
}

function addStatus(entity, tag, duration = 1) {
    const status = JSON.parse(entity.STATUS || '[]');
    const existing = status.find(([t]) => t === tag);
    if (existing) {
        existing[1] += duration; // prolonga
    } else {
        status.push([tag, duration]);
    }
    entity.STATUS = JSON.stringify(status);
}

function reduceStatus(entity, tag, amount = 1) {
    const status = JSON.parse(entity.STATUS || '[]');
    const index = status.findIndex(([t]) => t === tag);
    if (index !== -1) {
        status[index][1] -= amount;
        if (status[index][1] <= 0) status.splice(index, 1); // remove
        entity.STATUS = JSON.stringify(status);
        return true;
    }
    return false;
}

function removeStatus(entity, tag) {
    const status = JSON.parse(entity.STATUS || '[]');
    const filtered = status.filter(s => {
        if (typeof s === 'string') return s !== tag;
        if (Array.isArray(s)) return s[0] !== tag;
        return true;
    });
    entity.STATUS = JSON.stringify(filtered);
}

function addDmgTypeEffect (entity, ele, log, pow = 1 ){
    switch (ele) {
        case "ct": {
            if (canEffect(entity, "STUN")) {
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "STUN") ? `${cf.add_stn}` : `${cf.is_stn}`));
                addStatus(entity, "STUN", (3*pow));
            }return;
        }case "cr": {
            if (canEffect(entity, "BLEED")) {
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "BLEED") ? `${cf.add_bld}` : `${cf.is_bld}`));
                addStatus(entity, "BLEED", (5*pow));
            }return;
        }case "pn": {
            if (canEffect(entity, "BLEED")) {
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "BLEED") ? `${cf.add_bld}` : `${cf.is_bld}`));
                addStatus(entity, "BLEED", (5*pow));
            }return;
        }case "ch": {
            if (canEffect(entity, "PARALZ")) {
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "PARALZ") ? `${cf.add_plz}` : `${cf.is_plz}`));
                addStatus(entity, "PARALZ", (5*pow));
            }return;
        }case "cg": {
            if (canEffect(entity, "PARALZ")) {
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "PARALZ") ? `${cf.add_plz}` : `${cf.is_plz}`));
                addStatus(entity, "PARALZ", (5*pow));
            }
            if (hasStatus(entity, "BURN")) {
                reduceStatus(entity, "BURN", (5*pow));
                if (!hasStatus(entity, "BURN")) log.push(`**${entity.nome}** ${cf.no_brn}`);
            }return;
        }case "qm": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "BURN") ? `${cf.add_brn}` : `${cf.is_brn}`));
            if (hasStatus(entity, "PLANT")) addStatus(entity, "BURN", (5*pow));
            addStatus(entity, "BURN", (5*pow));
            return;
        }case "vt": {
            if (canEffect(entity, "NAUSEA")) {
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "NAUSEA") ? `${cf.add_nau}` : `${cf.is_nau}`));
                addStatus(entity, "NAUSEA", (5*pow));
            }return;
        }case "ep": return;
    }
}

function canEffect (entity, effect ){
    if (hasStatus(entity, "UNDEAD")) {
        switch (effect) {
            case "STUN":
            case "BLEED":
            case "POISON":
            case "PARALZ":
            case "NAUSEA": {
                return false;
            }
        }
    }
    if (hasStatus(entity, "PLANT")) {
        switch (effect) {
            case "BLEED": {
                return false;
            }
        }
    }
    return true;
}

function addLimbDmgEffect (entity, limb, log, pow = 1 ){
    switch (limb) {
        case "right arm": {
            if (getStatusDuration(entity, "INJ_BD") < 2) {
                log.push (`⚠️ **${entity.nome}** `+ ((getStatusDuration(entity, "INJ_BD")+pow) >= 2 ? `${cf.brk_bd}` : `${cf.inj_bd}`));
                addStatus(entity, "INJ_BD", pow);
            }return;
        }case "left arm": {
            if (getStatusDuration(entity, "INJ_BE") < 2) {
                log.push (`⚠️ **${entity.nome}** `+ ((getStatusDuration(entity, "INJ_BE")+pow) >= 2 ? `${cf.brk_be}` : `${cf.inj_be}`));
                addStatus(entity, "INJ_BE", pow);
            }return;
        }case "right leg": {
            if (getStatusDuration(entity, "INJ_PD") < 2) {
                log.push (`⚠️ **${entity.nome}** `+ ((getStatusDuration(entity, "INJ_PD")+pow) >= 2 ? `${cf.brk_pd}` : `${cf.inj_pd}`));
                addStatus(entity, "INJ_PD", pow);
            }return;
        }case "left leg": {
            if (getStatusDuration(entity, "INJ_PE") < 2) {
                log.push (`⚠️ **${entity.nome}** `+ ((getStatusDuration(entity, "INJ_PE")+pow) >= 2 ? `${cf.brk_pe}` : `${cf.inj_pe}`));
                addStatus(entity, "INJ_PE", pow);
            }return;
        }
        case "right wing":
        case "left wing": {
            if (hasStatus(entity, "FLY")){
                reduceStatus(entity, "FLY", pow)
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "FLY") ? `${cf.no_fly}` : `${cf.inj_wg}`));
            }return;
        }
        return;
    }
}

/*function hasStatus(entity, tag) {
 *    const status = JSON.parse(entity.STATUS || '[]');
 *    return status.includes(tag);
 * }
 *
 * function addStatus(entity, tag) {
 *    const status = new Set(JSON.parse(entity.STATUS || '[]'));
 *    status.add(tag);
 *    entity.STATUS = JSON.stringify([...status]);
 * }
 *
 * function removeStatus(entity, tag) {
 *    const status = new Set(JSON.parse(entity.STATUS || '[]'));
 *    status.delete(tag);
 *    entity.STATUS = JSON.stringify([...status]);
 * }*/

function r2d10() {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let total = d1+d2
    if (DEBUG) console.log("roll result:"+ d1+ ","+d2+"("+total+")")
        return { d1, d2, total };
}

module.exports = { CombatTriggers, hasStatus, addStatus, removeStatus, reduceStatus, getStatusDuration, addDmgTypeEffect, addLimbDmgEffect, canEffect };
