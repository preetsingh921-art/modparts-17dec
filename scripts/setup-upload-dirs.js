const fs = require('fs');
const path = require('path');

// Directories to create
const directories = [
  'public/uploads',
  'public/uploads/logos',
  'public/uploads/favicons',
  'config'
];

console.log('🔧 Setting up upload directories...');

directories.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`✓ Directory already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create directory ${dir}:`, error.message);
  }
});

// Create .gitkeep files to ensure directories are tracked
const gitkeepFiles = [
  'public/uploads/.gitkeep',
  'public/uploads/logos/.gitkeep',
  'public/uploads/favicons/.gitkeep'
];

gitkeepFiles.forEach(file => {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '# This file ensures the directory is tracked by git\n');
      console.log(`✅ Created .gitkeep: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create .gitkeep ${file}:`, error.message);
  }
});

console.log('🎉 Upload directories setup complete!');
