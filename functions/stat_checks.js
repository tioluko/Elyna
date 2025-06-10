const { getUserData, updateUserData } = require('../utils/db.js');

function r2d10DT(bonus, DT) {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let result = (d1+d2+bonus >= DT) ? 'Sucesso' :'Falha';
    let msg = `Rolou 2d10+${bonus} : ${d1} , ${d2} (${d1+d2+bonus}) Resultado: ${result} (DT:${DT})`
    console.log("Rolou 2d10+",bonus," : ",d1," , ",d2," (",(d1+d2+bonus),") Resultado: ",result," (DT:",DT,")")
    if (d1+d2 === 20) console.log("Critico!");
    return msg;
}
function r2d10(bonus) {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let result = d1+d2+bonus;
    console.log("Rolou 2d10+",bonus," : ",d1," , ",d2," (",(d1+d2+bonus),")")
    if (d1+d2 === 20) console.log("Critico!");
    return result;
}
function reacao(user, bonus) {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let result = d1+d2+user.RE+user[bonus];
    console.log("Rolou 2d10+",user.RE+user[bonus]," : ",d1," , ",d2," (",(result),")")
    if (d1+d2 === 20) console.log("Critico!");
    return result;
}
function acerto(user, bonus) {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let result = d1+d2+user.AGI+user[bonus];
    console.log("Rolou 2d10+",user.AGI+user[bonus]," : ",d1," , ",d2," (",(result),")")
    if (d1+d2 === 20) console.log("Critico!");
    return result;
}

/*function fullheal(user) {
    const u = getUserData(user.id);
    const updates = {
        PV: u.MPV,
        PM: u.MPM,
        PE: u.MPE,
        DC: u.MDC
    };
    console.log("Applying fullheal updates:", updates);
    updateUserData(user.id, updates);
}*/

module.exports = { r2d10 , r2d10DT };
