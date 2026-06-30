const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'dist-tauri');

// Read package.json version
const pkgPath = path.join(__dirname, 'package.json');
let pkgVersion = '1.0.0';
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkgVersion = pkg.version;
  } catch (e) {
    console.error('Failed to read package.json version:', e);
  }
}

// Create destDir if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

// Clear destDir
const clearDirectory = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      clearDirectory(fullPath);
      fs.rmdirSync(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
};
clearDirectory(destDir);

// Files and folders to copy
const filesToCopy = [
  'renderer.js',
  'taskmanager.js',
  'archive.js',
  'locales.js',
  'constants.js',
  'index.html',
  'taskmanager.html',
  'archive.html',
  'about.html',
  'style.css',
  'taskmanager.css',
  'icon.png',
  'tauri-bridge.js'
];

const foldersToCopy = [
  'assets',
  'lib',
  'models'
];

filesToCopy.forEach(file => {
  const src = path.join(srcDir, file);
  if (fs.existsSync(src)) {
    if (file === 'tauri-bridge.js') {
      let content = fs.readFileSync(src, 'utf8');
      content = content.replace(
        "window.__TAURI__.core.invoke('get_version')",
        `Promise.resolve("${pkgVersion}")`
      );
      fs.writeFileSync(path.join(destDir, file), content);
    } else {
      fs.copyFileSync(src, path.join(destDir, file));
    }
  }
});

const copyFolderRecursive = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      // Skip raw uncompressed model folders during packaging copy
      if (file === 'en' || file === 'zh') return;
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

foldersToCopy.forEach(folder => {
  const src = path.join(srcDir, folder);
  if (fs.existsSync(src)) {
    copyFolderRecursive(src, path.join(destDir, folder));
  }
});

console.log('Frontend assets copied to dist-tauri successfully!');

// Sync version to tauri.conf.json
const tauriConfigPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');

if (fs.existsSync(pkgPath) && fs.existsSync(tauriConfigPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
    
    // Extract base semver (e.g., "1.7.0") from "1.7.0-build.000019" to ensure strict SemVer validation passes
    let cleanVersion = pkg.version;
    if (cleanVersion.includes('-build.')) {
      cleanVersion = cleanVersion.split('-build.')[0];
    }
    
    tauriConfig.version = cleanVersion;
    fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));
    console.log(`Synced Tauri app version to ${cleanVersion} successfully!`);
  } catch (e) {
    console.error('Failed to sync version to tauri.conf.json:', e);
  }
}
