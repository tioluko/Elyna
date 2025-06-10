const { DEBUG } = require('../config.js');

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
            log.push(`:star: **Blitz ativado** :star:`);
            return {
                acerto: 10,
                consome: true };
        }
    },

    onAction: {
        REC_PR: (entity, log) => {
            const max = +entity.MPR || 0;
            const rec = Math.floor(max / 2);
            entity.PR = Math.min(entity.PR + rec, max);
            log.push(`**${entity.nome}** se reequilibra recuperando ${rec} PR ✨\n`);
            return {
                break: true };
        },
        FUGA: (entity, log) => {
            addStatus(entity, "FUGA");
            log.push(`**${entity.nome}** está tentando fugir!\n`);
            return {
                break: true };
        }
    },

    onHitAfter: {
        sangramento: (target, log) => {
            target.PV -= 2;
            log.push(`🩸 Sofreu 2 de dano por sangramento!`);
        }
    }
};

function hasStatus(entity, tag) {
    const status = JSON.parse(entity.STATUS || '[]');
    return status.includes(tag);
}

function addStatus(entity, tag) {
    const status = new Set(JSON.parse(entity.STATUS || '[]'));
    status.add(tag);
    entity.STATUS = JSON.stringify([...status]);
}

function removeStatus(entity, tag) {
    const status = new Set(JSON.parse(entity.STATUS || '[]'));
    status.delete(tag);
    entity.STATUS = JSON.stringify([...status]);
}

module.exports = { CombatTriggers, hasStatus, addStatus, removeStatus };
