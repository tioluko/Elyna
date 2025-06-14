const { DEBUG } = require('../config.js');
const { total } = require('./stats');
const { cf } = require('../data/locale.js');

const CombatTriggers = {
    onTurnStart: {
        regenerar_pm: (entity, log) => {
            entity.PM += 5;
            log.push(`✨ Recuperou 5 PM com regeneração mágica`);
        },
        camuflado: (entity, log) => {
            log.push(`🫥 ${entity.nome} permanece camuflado...`);
        }
    },

    onHitBefore: {
        PR_BOOST: (entity, log) => {
            if (DEBUG) console.log("Pr boost ativado");
            return {
                consome: true };
        },
        BLITZ: (entity, log) => {
            if (DEBUG) console.log("Blitz ativado");
            log.push(cf.blitz);
            return {
                acerto: 10,
                consome: true };
        },
        STUN: (entity, log) => {
            if (DEBUG) console.log("Stun debuff ativo");
            const pen = Math.ceil(getStatusDuration(entity, "STUN")/3)
            console.log("Stun before hit:",getStatusDuration(entity, "STUN"));
            reduceStatus(entity, "STUN");
            console.log("Stun after hit:",getStatusDuration(entity, "STUN"));
            return {
                acerto: -pen };
        }
    },

    onAction: {
        REC_PR: (entity, log) => {
            const max = +entity.MPR || 0;
            const rec = Math.floor(max / 2);
            entity.PR = Math.min(entity.PR + rec, max);
            log.push(`**${entity.nome}** ${cf.rec_pr} ${rec} PR ✨`);
            return;
        },
        FUGA: (entity, log) => {
            addStatus(entity, "FUGA");
            log.push(`**${entity.nome}** ${cf.running}!`);
            return;
        }
    },

    onHitEffect: {
        POISON: (entity, log) => {
            const dt = 15;
            const stat = total(entity, "RES")
            const roll = r2d10();
            const result = roll.total + stat;
            if (DEBUG) console.log('.');
            log.push(`🎲 ${cf.resroll}: ** ${result} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${stat}} DT:**${dt}**`);

            if (result >= dt) {
                log.push(`**${entity.nome}** ${cf.psn_res}`);
                return;
            }else {
                addStatus(entity, "POISON", (1+dt-result));
                log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "POISON") ? `${cf.add_psn}` : `${cf.is_psn}`));
                return;
            }
        },
        BLEED: (entity, log) => {
            target.PV -= 2;
            log.push(`🩸 Sofreu 2 de dano por sangramento!`);
        }
    },

    onTurnEnd: {
        POISON: (entity, log) => {
            entity.PV -= 1;
            reduceStatus(entity, "POISON"); // reduz 1 turno
            log.push(`**${entity.nome}** ${cf.tk} **1** ${cf.psn_dmg}! 🤢`);
            return;
        },
        BLEED: (entity, log) => {
            const dmg = Math.ceil(getStatusDuration(entity, "BLEED")/5);
            console.log("bleed power:", dmg)
            entity.PV -= dmg;
            reduceStatus(entity, "BLEED"); // reduz 1 turno
            log.push(`**${entity.nome}** ${cf.tk} **${dmg}** ${cf.bld_dmg}! 🩸`);
            return;
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
/*
 * c o*rtante > sangramento
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
function addDmgTypeEffect (entity, ele, log, pow = 1 ){
    switch (ele) {
        case "ct": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "STUN") ? `${cf.add_stn}` : `${cf.is_stn}`));
            addStatus(entity, "STUN", (3*pow));
            return;
        }case "cr": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "BLEED") ? `${cf.add_bld}` : `${cf.is_bld}`));
            addStatus(entity, "BLEED", (5*pow));
            return;
        }case "pn": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "BLEED") ? `${cf.add_bld}` : `${cf.is_bld}`));
            addStatus(entity, "BLEED", (5*pow));
            return;
        }case "ch": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "PARALZ") ? `${cf.add_plz}` : `${cf.is_plz}`));
            addStatus(entity, "PARALZ", (5*pow));
            return;
        }case "cg": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "PARALZ") ? `${cf.add_plz}` : `${cf.is_plz}`));
            addStatus(entity, "PARALZ", (5*pow));
            return;
        }case "qm": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "BURN") ? `${cf.add_brn}` : `${cf.is_brn}`));
            addStatus(entity, "BURN", (5*pow));
            return;
        }case "vt": {
            log.push (`⚠️ **${entity.nome}** `+ (hasStatus(entity, "NAUSEA") ? `${cf.add_nau}` : `${cf.is_nau}`));
            addStatus(entity, "NAUSEA", (5*pow));
            return;
        }case "ep": return;
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

module.exports = { CombatTriggers, hasStatus, addStatus, removeStatus, reduceStatus, getStatusDuration, addDmgTypeEffect };
