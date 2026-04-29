const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  console.log('🚀 Starting AppX assets generation...');
  
  const sourcePath = path.join(__dirname, 'build', 'icon.png');
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Error: build/icon.png not found!');
    app.quit();
    return;
  }

  const assetsDir = path.join(__dirname, 'build', 'appx');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  let img = nativeImage.createFromPath(sourcePath);

  const sizes = [
    { name: 'StoreLogo.png', w: 50, h: 50 },
    { name: 'Square44x44Logo.png', w: 44, h: 44 },
    { name: 'Square150x150Logo.png', w: 150, h: 150 },
    { name: 'Square71x71Logo.png', w: 71, h: 71 },
    { name: 'Square310x310Logo.png', w: 310, h: 310 },
    { name: 'Wide310x150Logo.png', w: 310, h: 150 },
    { name: 'SplashScreen.png', w: 620, h: 300 }
  ];

  sizes.forEach(s => {
    const resized = img.resize({ width: s.w, height: s.h, quality: 'best' });
    fs.writeFileSync(path.join(assetsDir, s.name), resized.toPNG());
    console.log(`✅ Generated: ${s.name} (${s.w}x${s.h})`);
  });

  console.log('🎉 All AppX assets created successfully in build/appx/');
  app.quit();
});
