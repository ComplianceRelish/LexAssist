const fs = require('fs');
const path = require('path');

// Ensure the directory exists
const ensureDirectoryExistence = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Copy the logo to both locations
const copyLogo = () => {
  const sourceFile = path.join(__dirname, 'public', 'images', 'logo.png');
  const targetDir1 = path.join(__dirname, 'dist'); // For production build
  const targetDir2 = path.join(__dirname, 'dist', 'images'); // For nested path
  
  ensureDirectoryExistence(targetDir1);
  ensureDirectoryExistence(targetDir2);
  
  fs.copyFileSync(sourceFile, path.join(targetDir1, 'logo.png'));
  fs.copyFileSync(sourceFile, path.join(targetDir2, 'logo.png'));
  
  console.log('Logo files copied to build output successfully');
};

copyLogo();