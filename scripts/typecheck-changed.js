/**
 * typecheck-changed.js
 * 
 * Valida a integridade semântica e de tipos dos arquivos modificados no Git (ou arquivos específicos)
 * utilizando o TypeScript Compiler API. Impede que ReferenceErrors ou quebras de tipos
 * passem para produção devido ao `vite build` não rodar typechecking.
 */
import ts from 'typescript';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getChangedFiles() {
  try {
    const diffOutput = execSync('git diff --name-only HEAD', { cwd: rootDir, encoding: 'utf-8' });
    const untrackedOutput = execSync('git status -s', { cwd: rootDir, encoding: 'utf-8' });

    const diffFiles = diffOutput.split('\n').map((f) => f.trim()).filter(Boolean);
    const untrackedFiles = untrackedOutput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('??') || line.startsWith('A ') || line.startsWith('M '))
      .map((line) => line.substring(3).trim())
      .filter(Boolean);

    const allFiles = Array.from(new Set([...diffFiles, ...untrackedFiles]))
      .map((f) => path.resolve(rootDir, f))
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    return allFiles;
  } catch {
    return [];
  }
}

const targetFiles = process.argv.slice(2).length > 0
  ? process.argv.slice(2).map((f) => path.resolve(rootDir, f))
  : getChangedFiles();

if (targetFiles.length === 0) {
  console.log('ℹ️  Nenhum arquivo TypeScript modificado encontrado para checagem.');
  process.exit(0);
}

console.log(`🔍 Checando integridade TypeScript em ${targetFiles.length} arquivo(s)...`);

const configPath = path.resolve(rootDir, 'tsconfig.app.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));

const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
let errorCount = 0;

for (const filePath of targetFiles) {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) continue;

  const diagnostics = [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile),
  ];

  for (const diag of diagnostics) {
    // Filtra erros em arquivos que não sejam o arquivo alvo diretamente
    if (!diag.file || path.resolve(diag.file.fileName) !== filePath) continue;

    errorCount++;
    const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    console.error(`❌ ${path.relative(rootDir, diag.file.fileName)}:${line + 1}:${character + 1} - ${message}`);
  }
}

if (errorCount > 0) {
  console.error(`\n🚨 Falha na checagem: ${errorCount} erro(s) de tipo/sintaxe encontrado(s)!`);
  process.exit(1);
} else {
  console.log('✅ Todos os arquivos modificados passaram na checagem com 0 erros!');
  process.exit(0);
}
