const fs = require('fs');
const file = 'D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/hooks/useChatStateResolver.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /  \/\/ Se n[^]+?futureCount: activeSessions\.length - 1 \};/;

const newStr = `  // Separar as demais ativas em Futuras e Passadas
  const futureSessions = activeSessions.filter(s => {
    const dataSessao = s.data_sessao || s.data;
    return dataSessao && getIsoDateLocal(dataSessao) > todayIso;
  }).sort((a, b) => {
    const dataA = a.data_sessao || a.data;
    const dataB = b.data_sessao || b.data;
    return new Date(dataA).getTime() - new Date(dataB).getTime(); // Crescente
  });

  if (futureSessions.length > 0) {
    return { activeWorkflow: futureSessions[0], futureCount: activeSessions.length - 1 };
  }

  // Se nao tem futura, sobrou apenas as passadas
  const pastSessions = activeSessions.sort((a, b) => {
    const dataA = a.data_sessao || a.data;
    const dataB = b.data_sessao || b.data;
    return new Date(dataB).getTime() - new Date(dataA).getTime(); // Decrescente
  });

  return { activeWorkflow: pastSessions[0], futureCount: activeSessions.length - 1 };`;

if(regex.test(code)) {
  code = code.replace(regex, newStr);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Fixed!');
} else {
  console.log('Regex match failed');
}
