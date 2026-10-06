const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace missing/corrupted specific words first
  content = content.replace(/Sess\?o/g, 'Sessão');
  content = content.replace(/sess\?o/g, 'sessão');
  content = content.replace(/Adicionar descrio/g, 'Adicionar descrição');
  content = content.replace(/Novo Tarefa/g, 'Nova Tarefa'); // Fix grammar from user request: Novo Tarefa -> Nova Tarefa
  
  // Identify if there's double encoded UTF-8
  // We'll use a regex that looks for common double-encoded UTF-8 prefixes
  // \u00C3 is Ã
  if (/\u00C3[\u0080-\u00BF]/.test(content)) {
    // There might be some valid latin1 sequences, we have to be careful
    // But since this is Portuguese, an Ã followed by something is almost always double encoding.
    // Let's replace ONLY the matched double-encoded sequences to avoid breaking the whole file if it contains legitimate characters.
    
    // Pattern for 2-byte UTF-8 sequences that were double encoded:
    // First byte is C2 or C3 (which is \u00C2 or \u00C3 in latin1)
    // Second byte is 80 to BF (which is \u0080 to \u00BF in latin1)
    content = content.replace(/[\u00C2\u00C3][\u0080-\u00BF]/g, (match) => {
      try {
        return Buffer.from(match, 'latin1').toString('utf8');
      } catch(e) {
        return match;
      }
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      walk(file);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fixFile(file);
    }
  }
}

walk(path.resolve(__dirname, 'src'));
console.log('Done!');
