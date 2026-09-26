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

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getChangedFiles() {
  try {
    const statusOutput = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf-8' });
    const files = [];

    for (const rawLine of statusOutput.split('\n')) {
      if (!rawLine.trim()) continue;
      // git status --porcelain tem 2 caracteres de status, 1 espaço, depois o caminho
      const filePath = rawLine.substring(3).trim().replace(/^"|"$/g, '');
      const fullPath = path.resolve(rootDir, filePath);
      
      // Ignora Edge Functions do Supabase (executadas em runtime Deno)
      if (filePath.startsWith('supabase') || filePath.startsWith('supabase/')) continue;

      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const findInDir = (dir) => {
            for (const item of fs.readdirSync(dir)) {
              const itemPath = path.join(dir, item);
              try {
                if (fs.statSync(itemPath).isDirectory()) {
                  findInDir(itemPath);
                } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
                  files.push(itemPath);
                }
              } catch {}
            }
          };
          findInDir(fullPath);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          files.push(fullPath);
        }
      } catch {}
    }

    return Array.from(new Set(files));
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

const allFilesToCompile = Array.from(new Set([...parsedConfig.fileNames, ...targetFiles]));
const program = ts.createProgram(allFilesToCompile, parsedConfig.options);
let errorCount = 0;

for (const filePath of targetFiles) {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    console.warn(`⚠️  Aviso: Não foi possível carregar AST para: ${path.relative(rootDir, filePath)}`);
    continue;
  }

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
