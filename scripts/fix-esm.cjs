#!/usr/bin/env node
/**
 * Post-build fix script for ES Module imports
 * TypeScript compiles imports without .js extensions, which Node.js ES modules require
 */

const fs = require('fs');
const path = require('path');

// List of files to fix and their import patterns
const filesToFix = [
  {
    file: 'dist/server/app.js',
    fixes: [
      ['from \'../core\'', "from '../core/index.js'"],
      ['from \'./database\'', "from './database-memory.js'"],
      ['from \'./database-memory\'', "from './database-memory.js'"],
    ],
    addImports: [
      // Add after the path import
      {
        after: "import path from 'path';",
        add: "import { fileURLToPath } from 'url';\n",
      },
      // Add __dirname definition
      {
        after: "const app = express();",
        add: "// Define __dirname for ES modules\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n",
      },
    ],
    addTeamSettings: true,
  },
  {
    file: 'dist/cli/index.js',
    fixes: [
      ['from \'../core/index\'', "from '../core/index.js'"],
      ['from \'../server/database\'', "from '../server/database-memory.js'"],
    ],
  },
  {
    file: 'dist/core/index.js',
    fixes: [
      ['from \'./types\'', "from './types.js'"],
      ['from \'./runtime\'', "from './runtime.js'"],
      ['from \'./noshadowing-protocol\'', "from './noshadowing-protocol.js'"],
      ['import { TodoAppRuntime } from \'./runtime\'', "import { TodoAppRuntime } from './runtime.js'"],
      ['import { NoGhostingProtocol } from \'./noshadowing-protocol\'', "import { NoGhostingProtocol } from './noshadowing-protocol.js'"],
    ],
  },
];

console.log('🔧 Fixing ES Module imports...\n');

filesToFix.forEach(({ file, fixes, addImports, addTeamSettings }) => {
  const filePath = path.join(__dirname, '..', file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let hasChanges = false;

  // Apply regex fixes
  fixes.forEach(([search, replace]) => {
    if (content.includes(search)) {
      content = content.replace(search, replace);
      hasChanges = true;
      console.log(`  ✓ Fixed import: ${search}`);
    }
  });

  // Add missing imports
  if (addImports) {
    addImports.forEach(({ after, add }) => {
      if (content.includes(after) && !content.includes(add.trim())) {
        content = content.replace(after, after + '\n' + add);
        hasChanges = true;
        console.log(`  ✓ Added import`);
      }
    });
  }

  // Add default team settings (for app.js)
  if (addTeamSettings && file === 'dist/server/app.js') {
    const searchStr = "members: members || [],\n            settings,";
    const replaceStr = `members: members || [],
                settings: settings || {
                    requireAcknowledgment: false,
                    acknowledgmentTimeoutHours: 24,
                    autoEscalationDays: 3,
                },`;
    if (content.includes(searchStr)) {
      content = content.replace(searchStr, replaceStr);
      hasChanges = true;
      console.log(`  ✓ Added default team settings`);
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Fixed: ${file}\n`);
  } else {
    console.log(`⏭️  No changes needed: ${file}\n`);
  }
});

console.log('✨ ES Module fixes complete!');
