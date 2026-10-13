// Örnek verilerden mobil uygulamanın okuduğu veri/yayin.json dosyasını üretir.
// Kullanım: node scripts/yayin-olustur.js
const fs = require('fs');
const path = require('path');
const Storage = require('../js/storage.js');
const Yayin = require('../js/yayin.js');

const hedef = path.join(__dirname, '..', 'veri', 'yayin.json');
const yayin = Yayin.olustur(Storage.demoState(new Date()), new Date());
fs.writeFileSync(hedef, JSON.stringify(yayin));
console.log(`${hedef} yazıldı (${yayin.tesisler.length} tesis, ${Math.round(fs.statSync(hedef).size / 1024)} KB)`);
