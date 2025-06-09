// Generate PWA icon set from the logo
// This script uses the existing logo to create icons of various sizes for PWA

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceImage = path.join(__dirname, 'public/images/logo.png');
const targetDir = path.join(__dirname, 'public/images/icons');

// Ensure the target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Generate icons for each size
sizes.forEach(size => {
  sharp(sourceImage)
    .resize(size, size)
    .toFile(path.join(targetDir, `icon-${size}x${size}.png`))
    .then(() => {
      console.log(`Generated icon-${size}x${size}.png`);
    })
    .catch(err => {
      console.error(`Error generating icon-${size}x${size}.png:`, err);
    });
});

// Also create a favicon
sharp(sourceImage)
  .resize(32, 32)
  .toFile(path.join(targetDir, 'favicon.png'))
  .then(() => {
    console.log('Generated favicon.png');
  })
  .catch(err => {
    console.error('Error generating favicon.png:', err);
  });

console.log('Icon generation script started. Check the console for results.');
