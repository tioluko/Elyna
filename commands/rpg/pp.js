const { SlashCommandBuilder } = require("discord.js");
const stats = require("../../functions/stats.js");
const { getUserData, updateUserData } = require("../../utils/db.js");
const { info, st, pp } = require("../../data/locale.js");

const perkChoices = [
  { name: st.adf, value: "Adf" },
  { name: st.arq, value: "Arq" },
  { name: st.des, value: "Des" },
  { name: st.arb, value: "Arb" },
  { name: st.atl, value: "Atl" },
  { name: st.art, value: "Art" },
  { name: st.bio, value: "Bio" },
  { name: st.exa, value: "Exa" },
  { name: st.hum, value: "Hum" },
  { name: st.ocu, value: "Ocu" },
  { name: st.eng, value: "Eng" },
  { name: st.inf, value: "Inf" },
  { name: st.ifm, value: "Ifm" },
  { name: st.inv, value: "Inv" },
  { name: st.mag, value: "Mag" },
  { name: st.med, value: "Med" },
  { name: st.pol, value: "Pol" },
  { name: st.sub, value: "Sub" },
  { name: st.vei, value: "Vei" },
];

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("pp")
    .setDescription("Distribute your PPs into skills")
    .setDescriptionLocalizations({
      "pt-BR": "Distribua seus Pontos de Perícia (PPs) em perícias",
    })
    .addStringOption((option) =>
      option
        .setName("skill")
        .setDescription("Each skill up cost 3 PP")
        .setNameLocalizations({
          "pt-BR": "pericia",
        })
        .setDescriptionLocalizations({
          "pt-BR": "Cada ponto em Perícia custa 3 PPs",
        })
        .setRequired(true)
        .addChoices(...perkChoices),
    )
    .addIntegerOption((option) =>
      option
        .setName("multi")
        .setDescription("Skill up ammount")
        .setNameLocalizations({
          "pt-BR": "multi",
        })
        .setDescriptionLocalizations({
          "pt-BR": "Incremento multiplo de perícia",
        }),
    ),

  async execute(interaction) {
    const user = getUserData(interaction.user.id);
    let choice = interaction.options.getString("skill");
    let choicename = perkChoices.find((attr) => attr.value === choice)?.name; //I need that because Discord.js wont let me pick an option choice name directly u.u
    let multi = interaction.options.getInteger("multi") ?? 1;

    if (!user) {
      return interaction.reply(info.no_character);
    }
    if (user.PP < multi * 3)
      interaction.reply(
        `:star: ${pp.nopp_1} **${multi * 3} ${st.pp}**s, ${pp.nopp_2} **${user.PP}** :star:`,
      );
    else if (
      user[choice] >= user.NV + 3 ||
      user[choice] + multi > user.NV + 3
    ) {
      interaction.reply(
        `:star: ${pp.olpp_1} ${choicename} ${pp.olpp_2} :star:`,
      );
    } else {
      user.PP -= multi * 3;
      user[choice] += multi;
      updateUserData(user.id, user);
      if (
        choice === "Adf" ||
        choice === "Arq" ||
        choice === "Des" ||
        choice === "Arb" ||
        choice === "Atl"
      ) {
        user.PR =
          Math.max(user.Adf, user.Arq, user.Des, user.Arb, user.Atl, user.Mag) +
          user.modPR;
        updateUserData(user.id, { PR: user.PR });
      }
      stats.update(user);
      interaction.reply(
        `:star: ${user.nome} ${pp.pdpp_1} **${choicename}** ${pp.to} **${user[choice]}** ${pp.paying} **${multi * 3} ${st.pp}**s (${pp.pdpp_2} ${user.PP}) :star:`,
      );
    }
  },
};
