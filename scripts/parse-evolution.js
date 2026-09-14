import fs from 'fs';

async function run() {
  const content = fs.readFileSync('C:/Users/Eduardo/.gemini/antigravity/brain/b722de6d-122a-4bf1-b2ea-cd84db3445b2/.system_generated/steps/2/content.md', 'utf8');
  
  const matches = content.match(/\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g);
  if (matches) {
    const unique = new Set(matches);
    const apiRoutes = Array.from(unique).filter(m => m.includes('chat') || m.includes('message'));
    console.log("API Routes found:", apiRoutes);
  }
}

run();
