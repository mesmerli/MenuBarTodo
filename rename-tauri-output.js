const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found!');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const fullVersion = pkg.version; // e.g. "1.7.1-build.000020"
let baseVersion = fullVersion;
if (fullVersion.includes('-build.')) {
  baseVersion = fullVersion.split('-build.')[0]; // e.g. "1.7.1"
} else {
  console.log('No build number found in version. Skipping rename.');
  process.exit(0);
}

const bundleDir = path.join(__dirname, 'src-tauri', 'target', 'release', 'bundle');

if (!fs.existsSync(bundleDir)) {
  console.log(`Bundle directory not found: ${bundleDir}. Skipping rename.`);
  process.exit(0);
}

function renameFilesRecursively(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      renameFilesRecursively(fullPath);
    } else {
      if (file.includes(baseVersion) && !file.includes(fullVersion)) {
        const newFile = file.replace(baseVersion, fullVersion);
        const newPath = path.join(dir, newFile);
        fs.renameSync(fullPath, newPath);
        console.log(`Renamed: ${file} -> ${newFile}`);
      }
    }
  });
}

console.log(`Scanning for installers to rename in ${bundleDir}...`);
renameFilesRecursively(bundleDir);
console.log('Renaming complete!');
