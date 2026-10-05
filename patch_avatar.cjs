const fs = require('fs');
let content = fs.readFileSync('src/hooks/useWorkflowPackageData.ts', 'utf-8');
const searchString = "nome: session.clientes?.nome || 'Cliente nǜo encontrado',";
const searchStringAlternative = "nome: session.clientes?.nome || 'Cliente não encontrado',";

const toInject = "nome: session.clientes?.nome || 'Cliente não encontrado',\n          avatarUrl: session.clientes?.avatar_url || null,\n          appointmentId: session.appointment_id || null,";

if (content.includes(searchString)) {
  content = content.replace(searchString, toInject);
  fs.writeFileSync('src/hooks/useWorkflowPackageData.ts', content);
  console.log('Sucesso!');
} else if (content.includes(searchStringAlternative)) {
  content = content.replace(searchStringAlternative, toInject);
  fs.writeFileSync('src/hooks/useWorkflowPackageData.ts', content);
  console.log('Sucesso!');
} else {
  console.log('Nao achou a string para dar replace!');
}
