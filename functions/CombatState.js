class CombatState {
    constructor(userId) {
        this.userId = userId;
        this.base = getUserData(userId);              // Dados brutos do banco
        this.perks = getUserPerks(userId);
        this.inventory = getUserInventory(userId);

        this.current = { ...this.base };              // Clone para estado de combate
        this.tempMods = {};                           // Modificadores temporários (buffs, debuffs)

        this._applyPermanentMods();
        this._applyTempMods();
        this._calculateDerivedStats();
    }

    _applyPermanentMods() {
        const sources = [...this.perks, ...this.inventory].filter(s => s.mods);
        for (const source of sources) {
            const mods = typeof source.mods === 'string'
            ? JSON.parse(source.mods)
            : source.mods;
            for (const key in mods) {
                const modKey = `mod${key}`;
                if (!this.current[modKey]) this.current[modKey] = 0;
                this.current[modKey] += mods[key];
            }
        }
    }

    _applyTempMods() {
        for (const key in this.tempMods) {
            const modKey = `mod${key}`;
            if (!this.current[modKey]) this.current[modKey] = 0;
            this.current[modKey] += this.tempMods[key];
        }
    }

    _calculateDerivedStats() {
        const u = this.current;
        u.RXP = 10 + ((u.NV - 1) ** 2) * 10;
        u.MPV = 10 + (u.RES * (u.NV + 2)) + ((u.NV - 1) * 4);
        u.MPM = 10 + (u.ESS * (u.NV + 2)) + ((u.NV - 1) * 4);
        u.MPE = 10 + (u.CAR * (u.NV + 2)) + ((u.NV - 1) * 4);
        u.MPR = Math.max(u.Adf, u.Arq, u.Des, u.Arb, u.Atl);
        u.RM = Math.floor((u.CAR + u.modCAR + u.INT + u.modINT) / 2);
        u.GM = 10 + u.NV + u.ESS + u.modESS;
        u.RE = Math.floor((u.AGI + u.modAGI + u.INT + u.modINT) / 2);
        u.MOV = Math.floor((u.FOR + u.modFOR + u.AGI + u.modAGI) / 2);
        u.EQ = ((u.FOR + u.modFOR) * 2);
        u.PER = u.INT + u.modINT + u.Inv;
    }

    // 📌 Adiciona um modificador temporário (não salva no banco)
    addTempMod(stat, value) {
        if (!this.tempMods[stat]) this.tempMods[stat] = 0;
        this.tempMods[stat] += value;
        this._applyTempMods();
        this._calculateDerivedStats();
    }

    // 📌 Atualiza o estado após alguma mudança
    refresh() {
        this.current = { ...this.base };
        this._applyPermanentMods();
        this._applyTempMods();
        this._calculateDerivedStats();
    }

    // 📤 Retorna os stats somados
    get() {
        return this.current;
    }
}

/*
Criar o estado de combate de um jogador:

const cs = new CombatState(userId);
const stats = cs.get(); // <- MOV, RM, GM já atualizados

Aplicar um buff temporário:

cs.addTempMod('CAR', +2);
const stats = cs.get();
console.log(stats.RM); // RM atualizado com +2 de modCAR

Aplicar um debuff:

cs.addTempMod('AGI', -1);

Recalcular tudo:

cs.refresh(); // Reaplica perks, itens e buffs temporários */
