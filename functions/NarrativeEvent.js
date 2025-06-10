function processNarrativeAction(user, selected) {
    const choice = selected.split(':')[1] ?? selected;

    // Simplesmente retorna resposta baseada na escolha
    if (choice === 'observar') return '👀 Você observa cuidadosamente o ambiente.';
    if (choice === 'aproximar') return '🚶‍♂️ Você se aproxima com cautela.';
    if (choice === 'fugir') return '🏃 Você foge rapidamente da situação.';

    return '🤷 Ação desconhecida.';
}

module.exports = { processNarrativeAction };
