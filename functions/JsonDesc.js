function describeMods(mods) {
    if (!mods || typeof mods !== 'object') return '';

    const regionMap = {
        RDcb: 'Cabeça',
        RDtr: 'Tronco',
        RDbd: 'Braço Direito',
        RDbe: 'Braço Esquerdo',
        RDpd: 'Perna Direita',
        RDpe: 'Perna Esquerda',
    };

    const rd = {};
    const others = [];

    // 🔍 Separar RD e outros mods
    for (const key in mods) {
        if (key.startsWith('RD')) {
            rd[key] = mods[key];
        } else if (typeof mods[key] === 'number') {
            // Traduz modXXX → +N XXX
            const attr = key.replace(/^mod/, '');
            const signal = mods[key] > 0 ? '+' : '';
            others.push(`${signal}${mods[key]} ${attr.toUpperCase()}`);
        }
    }

    // 🧠 Processar RD detalhado
    const rdOut = (() => {
        if (Object.keys(rd).length === 0) return '';

        const result = {};
        const braçosIguais = rd.RDbd !== undefined && rd.RDbe !== undefined && rd.RDbd === rd.RDbe;
        const pernasIguais = rd.RDpd !== undefined && rd.RDpe !== undefined && rd.RDpd === rd.RDpe;

        if (braçosIguais) {
            result['Braços'] = rd.RDbd;
            delete rd.RDbd;
            delete rd.RDbe;
        }

        if (pernasIguais) {
            result['Pernas'] = rd.RDpd;
            delete rd.RDpd;
            delete rd.RDpe;
        }

        for (const key in rd) {
            const label = regionMap[key] || key;
            result[label] = rd[key];
        }

        const grouped = {};
        for (const [label, val] of Object.entries(result)) {
            if (!grouped[val]) grouped[val] = [];
            grouped[val].push(label);
        }

        return 'RD: ' + Object.entries(grouped)
        .sort((a, b) => b[0] - a[0])
        .map(([val, locs]) => `${val}-${locs.join(', ')}`)
        .join(', ');
    })();

    const final = [rdOut, ...others];
    return final.filter(Boolean).join(' ');
}

function safeJsonParse(str) {
    try {
        return typeof str === 'object' ? str : JSON.parse(str);
    } catch (e) {
        console.warn('Erro ao fazer parse de mods:', str);
        return {};
    }
}

module.exports = { describeMods, safeJsonParse };
