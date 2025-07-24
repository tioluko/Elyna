const { SlashCommandBuilder } = require('discord.js');
const { db, getUserData, updateUserData } = require('../../utils/db.js');
const { getTile } = require('../../functions/MapReader.js');
const { info, st, map } = require('../../data/locale.js');
const stats = require("../../functions/stats.js");
const block = require('../../utils/block.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('rest')
    .setDescription('Descansa seu personagem para recuperar PV, PE e PM'),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);

        const blocks = block.noChar(user) || block.onEvent(user);
        if (blocks) return interaction.reply({ content: blocks , ephemeral: true });

        const now = new Date();
        const nowISO = now.toISOString();
        const [x, y] = user.AREA.split(',').map(Number);
        const tile = getTile(x, y);

        // Verifica se já está descansando
        if (user.EVENT?.startsWith('rest:')) {
            const startTime = new Date(user.EVENT.slice(5));
            const diffMs = now - startTime;
            const diffMin = Math.floor(diffMs / 60000);

            if (diffMin < 1) {
                return interaction.reply({ content: map.soon, ephemeral: true });
            }

            // Cálculo da recuperação
            const PVrest = Math.floor(diffMin * (stats.total(user, "RES") / 10));
            const PErest = Math.floor(diffMin * ((2 + stats.total(user, "CAR")) / 10));
            const PMrest = Math.floor(diffMin * ((user.NV + (tile.cont * 5)) / 10));
            const PVmax = user.MPV - user.PV;
            const PEmax = user.MPE - user.PE;
            const PMmax = user.MPM - user.PM;

            const updated = {
                PV: Math.min(user.PV + PVrest, user.MPV),
                PE: Math.min(user.PE + PErest, user.MPE),
                PM: Math.min(user.PM + PMrest, user.MPM),
            };

            db.prepare(`
            UPDATE users SET PV = ?, PE = ?, PM = ?, EVENT = 'none'
            WHERE id = ?
            `).run(updated.PV, updated.PE, updated.PM, user.id);

            console.log(`taxa de recuperação/10m (PV/PM/PE): `+' '+stats.total(user, "RES")+' '+(2 + stats.total(user, "CAR"))+' '+ (user.NV + (tile.cont * 5)) ); // log
            return interaction.reply(
                `🌅 ${map.ecamp} ${diffMin} ${map.ecamp2}\n` +
                `❤️**${st.hp}**: + ${Math.min(PVrest,PVmax)}\n` +
                `💧**${st.mp}**: + ${Math.min(PMrest,PMmax)}\n` +
                `🧩**${st.sp}**: + ${Math.min(PErest,PEmax)}\n`
            );
        }

        // Iniciar descanso
        db.prepare(`UPDATE users SET EVENT = ? WHERE id = ?`)
        .run(`rest:${nowISO}`, user.id);

        return interaction.reply(`${map.camp} \n ${map.camp2}`);
    }
};
