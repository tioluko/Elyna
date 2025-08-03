const { DEBUG } = require("../../config.js");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pagination = require("../../functions/pagination.js");
const stats = require("../../functions/stats.js");
const {
  getUserData,
  getUserPerks,
  getUserInventory,
  getUserMoves,
  updateUserData,
} = require("../../utils/db.js");
const { describeMods, safeJsonParse } = require("../../functions/JsonDesc.js");
const { info, ficha, st } = require("../../data/locale.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Display your character sheet")
    .setNameLocalizations({"pt-BR": "ficha",})
    .setDescriptionLocalizations({"pt-BR": "Mostra a ficha do seu personagem",})
    .addIntegerOption(option =>
    option.setName('page')
    .setDescription('Pick a sheet page')
    .setDescriptionLocalizations({ "pt-BR": "Abra em uma pagina específica", })
    .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    await interaction.respond(
      [
        { name: ficha.skills, value: 1 },
        { name: ficha.perks, value: 2 },
        { name: ficha.combat_stats, value: 3 },
        { name: ficha.inventory, value: 4 },
      ].slice(0, 25));
  },

  async execute(interaction) {
    const user = getUserData(interaction.user.id);
    //console.log('[1] user.modCAR (antes modApply):', user.modCAR);
    if (!user) return interaction.reply({ content: info.no_character , ephemeral: true });

    const perks = getUserPerks(interaction.user.id);
    const inv = getUserInventory(interaction.user.id);
    const movesData = getUserMoves(interaction.user.id);
    const initpage = interaction.options.getInteger("page") ?? 0;
    console.log("page "+initpage);
    //console.log(perks);
    // Atualiza os valores derivados
    stats.modApply(user);
    stats.updatePerkMoves(user.id);
    stats.addxp(user, 0);
    //updateUserData(user.id, stats.calculateStats(user));
    stats.update(user);
    const freshUser = getUserData(interaction.user.id);
    const u = stats.getTotalStats(freshUser);

    const icons = {
      racial: "🧬",
      natural: "🌿",
      sobrenatural: "✨",
      head: `👩‍🦲 **${st.rd} ** ${u.RDcb + u.RD} `,
      torso: `🩱 **${st.rd} ** ${u.RDtr + u.RD} `,
      arms: `💪 **${st.rd} **${u.RDbd + u.RD},${u.RDbe + u.RD}`,
      legs: `🦵 **${st.rd} **${u.RDpd + u.RD},${u.RDpe + u.RD}`,
      rhand: "🤚 ",
      lhand: "✋ ",
      hands: "👐 ",
      acc: "🔸 ",
    };
    const perkorder = ["racial", "natural", "sobrenatural"];
    const equipSlots = ["head","torso","arms","legs","rhand","lhand","hands","acc"];
    const equipped = {};
    const backpack = [];

    const perksort = perks.sort((a, b) => {
      return perkorder.indexOf(a.tipo) - perkorder.indexOf(b.tipo);
    });
    const perkList = perksort
      .map((p) => {
        const nivel = p.quantidade > 1 ? ` ${p.quantidade}` : "";
        const perkicon = icons[p.tipo] || "";
        return `${perkicon} **${p.nome}${nivel}** — *${p.descricao}*`;
      })
      .join("\n");

    for (const item of inv) {
      const slot = item.slot_override || item.slot;
      if (item.equipado && equipSlots.includes(slot)) {
        if (slot === "acc") {
          if (!equipped.acc) equipped.acc = [];
          equipped.acc.push(item);
        } else {
          equipped[slot] = item;
        }
      } else {
        backpack.push(item);
      }
    }
    const equipList = equipSlots
      .filter((slot, _, arr) => {
        // Se houver um item de duas mãos, pule rhand e lhand
        if (equipped.hands) {
          if (slot === 'rhand' || slot === 'lhand') return false;
        }

        // Se NÃO houver item 2hand, não mostre slot "hands"
        if (!equipped.hands && slot === 'hands') return false;

        return true;
      })
      .map((slot) => {
        if (slot === "acc") {
          const accs = equipped.acc || [];
          if (accs.length === 0)
            return `${icons.acc} **${ficha.acc}**: *${ficha.empty}*`;
          return (
            `💍 **${ficha.acc}**:\n` +
            accs
              .map((a) => {
                const modsText = describeMods(safeJsonParse(a.mods));
                return `${icons.acc} <**${a.nome}**> ${modsText ? `\n-# ${modsText}` : `\n-# ${ficha.nomods}`}`;
              })
              .join("\n")
          );
        }
        const item = equipped[slot];
        if (!item) return `${icons[slot]} *${ficha.empty}*`;

        const modsText = describeMods(safeJsonParse(item.mods));
        return `${icons[slot]} <**${item.nome}**> ${modsText ? `\n-# ${modsText}` : `\n-# ${ficha.nomods}`}`;
      })
      .join("\n");

      const itemList = backpack.map((i) => `• **${i.nome}** x${i.quantidade}`)
      .join("\n");
      //const itemList = backpack.map(i => `• **${i.nome}** x${i.quantidade} \n-# ${i.descricao}`).join('\n');

      const moveList = movesData.map(m => {
        let origemLabel = 'basic';

        if (m.origem?.startsWith("equip:")) {
          const itemId = parseInt(m.origem.split(":")[1]);
          const item = inv.find(i => i.id === itemId);
          origemLabel = item?.nome || 'equip';
        } else if (m.origem?.startsWith("perk:")) {
          const perkId = parseInt(m.origem.split(":")[1]);
          const perk = perks.find(p => p.perk_id === perkId);
          origemLabel = perk?.nome || 'perk';
        }

        //const danoStr = m.DN ? `Dano: ${m.DN}${m.ELE ? ` (${m.ELE})` : ''}` : '';
        let danoStr = '';
        switch (m.tipo) {
          case 1:
            danoStr = `Dano: **${m.DN + u.FOR}**${m.ELE ? ` (${m.ELE})` : ''}`;
            break;
          case 2:
            danoStr = `Dano: **${m.DN + u.FOR}**${m.ELE ? ` (${m.ELE})` : ''}`;
            break;
          case 3:
            danoStr = `Dano: **${m.DN}**${m.ELE ? ` (${m.ELE})` : ''}`;
            break;
          case 4:
            danoStr = `Dano: **${Math.floor(u.ESS + (u.NV * m.DN))}**${m.ELE ? ` (${m.ELE})` : ''}`;
            break;
          case 5:
            danoStr = `Dano: **${Math.floor(u.ESS + (u.NV * m.DN))}**${m.ELE ? ` (${m.ELE})` : ''}`;
            break;
          default:
            danoStr = ''; // tipo 0 ou indefinido
        }
        return `**${m.nome}**  ${danoStr} <${origemLabel}${m.tipo !== 0 ? ` (${st[m.pericia.toLowerCase()]})>` : '>'}`;
      }).join('\n') || ficha.empty;

      let bar = ["", "", "", ""];
      let blk = "";
      let eblk = ":black_large_square:";
      let blocks = 5;
      let fill;
      for (let j = 0; j < 4; j++) {
        if (j === 0) {blk = [":red_square:", "PV"];}
        if (j === 1) {blk = [":blue_square:", "PM"];}
        if (j === 2) {blk = [":green_square:", "PE"];}
        if (j === 3) {blk = [":zap:", "PR"]; eblk = "";}

        if (user[blk[1]] <= 0) {
          fill = 0;
        } else if (user[blk[1]] >= user["M" + blk[1]]) {
          fill = blocks;
        } else {
          fill = Math.min(
            blocks - 1,
            Math.max(1, Math.round((user[blk[1]] / user["M" + blk[1]]) * blocks)),
          );
        }
        for (let i = 0; i < blocks; i++) {
          bar[j] += i < fill ? blk[0] : eblk;
        }
      }
      // Preenche as paginas
    const embeds = [];
    for (let i = 0; i < 5; i++) {
      if (i === 0)
        embeds.push(new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(user.nome)
        .setDescription(`**${st.nv}:** ${user.NV} \n**XP:** ${user.XP} / ${user.RXP}`)
        .setThumbnail(user.image)
        .setFooter({
          text: interaction.user.username,
          iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,
        })
        .addFields(
          {name: `***${ficha.base_stats}*** [ *${st.pc}s:* ***${user.PC}*** ]`,
           value:
            `💪 **${st.for}**: ${u.FOR}\n` +
            `🤸 **${st.agi}**: ${u.AGI}\n` +
            `🧱 **${st.res}**: ${u.RES}\n` +
            `🧠 **${st.int}**: ${u.INT}\n` +
            `😎 **${st.car}**: ${u.CAR}\n` +
            `✨ **${st.ess}**: ${u.ESS}\n` +
            `🌀 **${st.sin}**: ${u.SIN}`

          },
          {name: `❤️ ${st.hp}: ${u.MPV} / ${u.PV}`, value: `${bar[0]}`},
          {name: `💧 ${st.mp}: ${u.MPM} / ${u.PM}`, value: `${bar[1]}`},
          {name: `🧩 ${st.sp}: ${u.MPE} / ${u.PE}`, value: `${bar[2]}`},
          {name: `⚡ ${st.rp}: ${u.MPR} / ${u.PR}`, value: ``},
          {name: `***${ficha.secondary_stats}***`,
            value:
            `**${st.rm}**: ${u.RM} (${st.rm_})\n` +
            `**${st.gm}**: ${u.GM} (${st.gm_})\n` +
            `**${st.re}**: ${u.RE} (${st.re_})\n` +
            `**${st.mov}**: ${u.MOV} (${st.mov_})\n` +
            `**${st.eq}**: ${u.EQ} (${st.eq_})\n` +
            `**${st.per}**: ${u.PER} (${st.per_})`
          },
        ),
        );
        else if (i == 1)
          embeds.push(new EmbedBuilder()
          .setColor("Blurple")
          .setTitle(user.nome)
          .setDescription(`**${st.nv} :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`,)
          .setThumbnail(user.image)
          .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,})
          .addFields(
            {name: `***${ficha.skills}***  [ *${st.pp}s:* ***${user.PP}*** ]`,
            value:
            `✊ **${st.des}**: ${user.Des}\n` +
            `🗡️ **${st.arb}**: ${user.Arb}\n` +
            `🏹 **${st.arq}**: ${user.Arq}\n` +
            `🔫 **${st.adf}**: ${user.Adf}\n` +
            `🏋️ **${st.atl}**: ${user.Atl}\n` +
            `🎭 **${st.art}**: ${user.Art}\n` +
            `🧬 **${st.bio}**: ${user.Bio}\n` +
            `🧮 **${st.exa}**: ${user.Exa}\n` +
            `📜 **${st.hum}**: ${user.Hum}\n` +
            `🔮 **${st.ocu}**: ${user.Ocu}\n` +
            `🛠️ **${st.eng}**: ${user.Eng}\n` +
            `🕵️ **${st.inf}**: ${user.Inf}\n` +
            `💻 **${st.ifm}**: ${user.Ifm}\n` +
            `🔍 **${st.inv}**: ${user.Inv}\n` +
            `🪄 **${st.mag}**: ${user.Mag}\n` +
            `⚕️ **${st.med}**: ${user.Med}\n` +
            `🗣️ **${st.pol}**: ${user.Pol}\n` +
            `🫢 **${st.sub}**: ${user.Sub}\n` +
            `🚗 **${st.vei}**: ${user.Vei}`
            },
          ),
          );
          else if (i == 2)
            embeds.push(new EmbedBuilder()
            .setColor("Blurple")
            .setTitle(user.nome)
            .setDescription(`**${st.nv} :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`,)
            .setThumbnail(user.image)
            .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,})
            .addFields(
              {name: `***${ficha.perks}***`,value: perkList || ficha.no_perk,},
              {name: "\u200B", value: "\u200B" },
            ),
            );
            else if (i == 3)
              embeds.push(new EmbedBuilder()
              .setColor("Blurple")
              .setTitle(user.nome)
              .setDescription(`**${st.nv} :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`,)
              .setThumbnail(user.image)
              .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,})
              .addFields(
                {name: `***${ficha.combat_stats}***`,value: `-# (${st.rd} = ${st.rd_})`,},
                         {name: `***${ficha.equip}***`, value: equipList || ficha.empty },
                         {name: "\u200B", value: "\u200B" },
                         {name: `***${ficha.moves}***`, value: moveList },
                         {name: "\u200B", value: "\u200B" },
              ),
              );
              else if (i == 4)
                embeds.push(new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(user.nome)
                .setDescription(`**${st.nv} :** ${user.NV} \n **XP :** ${user.XP} / ${user.RXP}`,)
                .setThumbnail(user.image)
                .setFooter({text: interaction.user.username, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,})
                .addFields(
                  {name: `***${ficha.inventory}***`, value: `*${ficha.wg}:* ***???***`, inline: true,}, //Botar peso total aqui
                  {name: "\u200B", value: `*${ficha.wg}*`, inline: true },
                  {name: "\u200B", value: "\u200B" },
                  {name: "\u200B", value: itemList || ficha.empty, inline: true },
                  {name: "\u200B", value: "\u200B", inline: true }, //Botar peso do item aqui
                  {name: "\u200B", value: "\u200B" },
              ),
          );
      }
      await pagination(interaction, embeds, initpage);
    },
};
