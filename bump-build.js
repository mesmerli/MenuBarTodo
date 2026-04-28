const fs = require('fs');
const path = require('path');

// 1. 讀取 package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// 2. 提取出基礎語意版號（例: 1.4.1），移除既有的 -build 後綴
const baseVersion = pkg.version.split('-build')[0];

// 3. 讀取/更新本機的累加 Build 流水號
const buildNoFile = path.join(__dirname, '.build_no');
let currentNo = 1;
if (fs.existsSync(buildNoFile)) {
  currentNo = parseInt(fs.readFileSync(buildNoFile, 'utf8'), 10) + 1;
}
fs.writeFileSync(buildNoFile, currentNo.toString());

// 4. 格式化為 6 位數 (例如 000001)
const buildNum = currentNo.toString().padStart(6, '0');

// 5. 組合新的臨時版號
pkg.version = `${baseVersion}-build.${buildNum}`;

// 6. 覆寫儲存
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`🚀 Pre-build check: Version bumped to ${pkg.version}`);
