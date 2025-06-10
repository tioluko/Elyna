const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pagination = require('../../functions/pagination.js');
const stats = require('../../functions/stats.js');
const { getUserData, getUserPerks, getUserInventory, getUserMoves, updateUserData } = require('../../utils/db.js');
const { describeMods, safeJsonParse } = require('../../functions/JsonDesc.js')
const { info, ficha, st } = require('../../data/locale.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ficha')
    .setDescription('mostra a ficha do seu personagem'),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        //console.log('[1] user.modCAR (antes modApply):', user.modCAR);
        if (!user) {
            return interaction.reply(info.no_character);
        }

        const perks = getUserPerks(interaction.user.id);
        const inv = getUserInventory(interaction.user.id);
        console.log(perks);
        // Atualiza os valores derivados
        stats.modApply(user);
        stats.addxp(user, 0);
        //updateUserData(user.id, stats.calculateStats(user));
        stats.update(user);
        const freshUser = getUserData(interaction.user.id);
        const u = stats.getTotalStats(freshUser);

        const icons = {
            racial: '🧬',
            natural: '🌿',
            sobrenatural: '✨',
            head: `👩‍🦲 **RD ** ${u.RDcb+u.RD} `,
            torso: `🩱 **RD ** ${u.RDtr+u.RD} `,
            arms: `💪 **RD **${u.RDbd+u.RD},${u.RDbe+u.RD}`,
            legs: `🦵 **RD **${u.RDpd+u.RD},${u.RDpe+u.RD}`,
            rhand: '🤚 ',
            lhand: '✋ ',
            acc: '🔸 '
        };
        const perkorder = ['racial', 'natural', 'sobrenatural'];
        const equipSlots = ['head', 'torso', 'arms', 'legs', 'rhand', 'lhand', 'acc'];
        const equipped = {};
        const backpack = [];

        const perksort = perks.sort((a, b) => {
            return perkorder.indexOf(a.tipo) - perkorder.indexOf(b.tipo);
        });
        const perkList = perksort.map(p => {
            const nivel = p.quantidade > 1 ? ` ${p.quantidade}` : '';
            const perkicon = icons[p.tipo] || '';
            return `${perkicon} **${p.nome}${nivel}** — *${p.descricao}*`;
        }).join('\n');

        for (const item of inv) {
            const slot = item.slot_override || item.slot;
            if (item.equipado && equipSlots.includes(slot)) {
                if (slot === 'acc') {
                    if (!equipped.acc) equipped.acc = [];
                    equipped.acc.push(item);
                }else {
                    equipped[slot] = item;
                }
            } else {
                backpack.push(item);
            }
        }
        const equipList = equipSlots.map(slot => {
            if (slot === 'acc') {
                const accs = equipped.acc || [];
                if (accs.length === 0) return `${icons.acc} **${ficha.acc}**: *${ficha.empty}*`;
                return `💍 **${ficha.acc}**:\n` + accs.map(a => {
                    const modsText = describeMods(safeJsonParse(a.mods));
                    return `${icons.acc} <**${a.nome}**> ${modsText ? `\n-# ${modsText}` : `\n-# ${ficha.nomods}` }`;
                }).join('\n');
            }
            const item = equipped[slot];
            if (!item) return `${icons[slot]} *${ficha.empty}*`;

            const modsText = describeMods(safeJsonParse(item.mods));
            return `${icons[slot]} <**${item.nome}**> ${modsText ? `\n-# ${modsText}` : `\n-# ${ficha.nomods}` }`;
        }).join('\n');

        const itemList = backpack.map(i => `• **${i.nome}** x${i.quantidade} \n-# ${i.descricao}`).join('\n');

        let bar = ["","","",""]; let blk = ""; let eblk = ":black_large_square:"; let blocks = 5; let fill;
        for (let j = 0; j < 4; j++) {
            if (j===0) {blk=[":red_square:","PV"] }
            if (j===1) {blk=[":blue_square:","PM"] }
            if (j===2) {blk=[":green_square:","PE"] }
            if (j===3) {blk=[":zap:","PR"]; eblk="" }

            if (user[blk[1]] <= 0) {fill = 0} else if (user[blk[1]] >= user["M"+blk[1]]) {
                fill = blocks;
            } else {
                fill = Math.min(blocks - 1, Math.max(1, Math.round(((user[blk[1]] / user["M"+blk[1]]) * blocks))));
            }
            for (let i = 0; i < blocks; i++) {
                bar[j] += i < fill ? blk[0] : eblk;
            }
        }
        // Preenche as paginas
        const embeds = [];
        for (let i = 0; i < 4; i++) {
            if (i === 0) embeds.push(new EmbedBuilder()
                .setColor("Blurple")
                //.setTitle(`Atributos Básicos`)
                .setTitle(user.nome)
                .setDescription(`**${st.nv} :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`)
                //.setImage(u.image)
                //.setAuthor({ name: interaction.u.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.u.id}/${interaction.u.avatar}.png`})
                .setThumbnail(user.image)
                .setFooter({ text: interaction.user.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`})
                .addFields(
                    { name: `***${ficha.base_stats}***`, value: `*${st.pc}s:* ***${user.PC}***` },
                    { name: '\u200B', value: `💪 ${st.for}: \n 🤸 ${st.agi}: \n 🧱 ${st.res}: \n 🧠 ${st.int}: \n 😎 ${st.car}: \n ✨ ${st.ess}: \n 🌀 ${st.sin}:`, inline: true },
                    { name: '\u200B', value: `**${u.FOR} \n ${u.AGI} \n ${u.RES} \n ${u.INT} \n ${u.CAR} \n ${u.ESS} \n ${u.SIN}**`, inline: true },
                    { name: '\u200B', value: `\n❤️ **${st.hp}: ** ${u.MPV} / ${u.PV} \n${bar[0]}\n💧 **${st.mp}: **${u.MPM} / ${u.PM} \n${bar[1]}\n🧩 **${st.sp}: ** ${u.MPE} / ${u.PE} \n${bar[2]}\n⚡ **${st.rp}: ** ${u.MPR} / ${u.PR}\n${bar[3]}`, inline: true },
                    //{ name: '\u200B', value: '\u200B'},
                    { name: '\u200B', value: `***${ficha.secondary_stats}***` },
                    { name: '\u200B', value: `**RM:** \n **GM:** \n **RE:** \n **MOV:** \n **EQ:** \n **PER:**` , inline: true },
                    { name: '\u200B', value: `${u.RM} \n ${u.GM} \n ${u.RE} \n ${u.MOV} \n ${u.EQ} \n ${u.PER}` , inline: true },
                    { name: '\u200B', value: `-# (Resistência Mental) \n-# (Guarda Magica) \n-# (Reação) \n-# (Movimento) \n-# (Equilíbrio) \n-# (Percepção)` , inline: true },
                    { name: '\u200B', value: '\u200B'}
                )
            );
            else if (i == 1) embeds.push(new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(user.nome)
                .setDescription(`**Nível :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`)
                .setThumbnail(user.image)
                .setFooter({ text: interaction.user.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`})
                .addFields(
                    { name: `***Perícias***`, value: `*PPs:* ***${user.PP}***` },
                    { name: '\u200B', value: `✊ **Desarmado:** \n🗡️ **Armas Brancas:** \n🏹 **Arquearia:** \n🔫 **Armas de Fogo:** \n🏋️ **Atletismo:** \n🎭 **Artes Performáticas:** \n🧬 **Biologicas:** \n🧮 **Exatas:** \n📜 **Humanas:** \n🔮 **Ocultismo:** \n🛠️ **Engenharia:** \n🕵️ **Infiltração:** \n💻 **Informática:** \n🔍 **Investigação:** \n🪄  **Magia:** \n⚕️ **Medicina:** \n🗣️ **Politica:** \n🫢 **Subterfúgio:** \n🚗 **Veículos:**` , inline: true },
                    { name: '\u200B', value: `${user.Des} \n ${user.Arb} \n ${user.Arq} \n ${user.Adf} \n ${user.Atl} \n ${user.Art} \n ${user.Bio} \n ${user.Exa} \n ${user.Hum} \n ${user.Ocu} \n ${user.Eng} \n ${user.Inf} \n ${user.Ifm} \n ${user.Inv} \n ${user.Mag} \n ${user.Med} \n ${user.Pol} \n ${user.Sub} \n ${user.Vei}` , inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: '\u200B', value: '\u200B'}
                )
            );
            else if (i == 2) embeds.push(new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(user.nome)
                .setDescription(`**Nível :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`)
                .setThumbnail(user.image)
                .setFooter({ text: interaction.user.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`})
                .addFields(
                    { name: `***Peculiaridades***`, value: perkList || 'Sem peculiaridades(wtf?).' },
                    { name: '\u200B', value: '\u200B'}
                )
            );
            else if (i == 3) embeds.push(new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(user.nome)
                .setDescription(`**Nível :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`)
                .setThumbnail(user.image)
                .setFooter({ text: interaction.user.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`})
                .addFields(
                    { name: `***Inventório***`, value: `-# (RD = Redução de Dano)`},
                    { name: `***Equipamento***`, value: equipList || '<vazio>' },
                    { name: `***Mochila***`, value: itemList || '<vazio>' },
                    { name: '\u200B', value: '\u200B'}
                )
            );
        }
        await pagination(interaction, embeds);
    }
};
