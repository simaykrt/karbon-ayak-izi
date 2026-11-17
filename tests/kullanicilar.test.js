const test = require('node:test');
const assert = require('node:assert/strict');

const Kullanicilar = require('../js/kullanicilar.js');
const Storage = require('../js/storage.js');
const Yayin = require('../js/yayin.js');

const demo = Storage.demoState(new Date(2026, 10, 17));
const tesisIdleri = demo.facilities.map((f) => f.id);
const liste = () => Kullanicilar.varsayilanKullanicilar();
const bul = (eposta) => liste().find((k) => k.eposta === eposta);

test('şifre özeti mobil uygulamayla aynı yöntemle hesaplanır', async () => {
  // Aynı değer mobil/test/kullanici_test.dart içinde de kontrol edilir.
  assert.equal(await Kullanicilar.sifreOzeti(' Yonetici@Karbon.com ', '123456'),
    'd29c6b2000acc6f5b4bcf05bb1b089476c48b1dda69817c129e43a9f5b4a6080');
});

test('tüm demo hesaplar 123456 şifresiyle giriş yapabilir', async () => {
  for (const k of liste()) {
    const sonuc = await Kullanicilar.girisDogrula(liste(), k.eposta, '123456');
    assert.equal(sonuc.kullanici && sonuc.kullanici.id, k.id, k.eposta);
  }
});

test('yanlış şifre ve pasif hesap reddedilir', async () => {
  assert.ok((await Kullanicilar.girisDogrula(liste(), 'yonetici@karbon.com', 'yanlis')).hata);
  assert.ok((await Kullanicilar.girisDogrula(liste(), 'yok@karbon.com', '123456')).hata);
  const l = liste();
  l.find((k) => k.id === 'k_ege').aktif = false;
  assert.match((await Kullanicilar.girisDogrula(l, 'personel.ege@karbon.com', '123456')).hata, /pasif/);
});

test('demo hesapların tesis atamaları örnek veride mevcut', () => {
  for (const k of liste()) {
    for (const id of k.tesisler) assert.ok(tesisIdleri.includes(id), `${k.eposta}: ${id}`);
    assert.equal(Kullanicilar.kullaniciKontrol(k, liste(), tesisIdleri), null, k.eposta);
  }
});

test('her rol yalnızca kendi tesislerini görür', () => {
  assert.equal(Kullanicilar.izinliTesisler(bul('yonetici@karbon.com'), demo.facilities).length, 8);
  assert.equal(Kullanicilar.izinliTesisler(bul('genelmudur@karbon.com'), demo.facilities).length, 8);
  assert.deepEqual(Kullanicilar.izinliTesisler(bul('gebze.mudur@karbon.com'), demo.facilities), ['demo_fabrika']);
  assert.deepEqual(Kullanicilar.izinliTesisler(bul('personel.ege@karbon.com'), demo.facilities).sort(), ['demo_depo', 'demo_otel']);
});

test('sekme yetkileri: veri girişi personelde ve yöneticide, kullanıcılar yalnızca yöneticide', () => {
  const s = (e, v) => Kullanicilar.sekmeIzinli(bul(e), v);
  assert.ok(s('personel.marmara@karbon.com', 'entry'));
  assert.ok(s('yonetici@karbon.com', 'entry'));
  assert.ok(!s('genelmudur@karbon.com', 'entry'));
  assert.ok(!s('gebze.mudur@karbon.com', 'entry'));
  assert.ok(s('yonetici@karbon.com', 'users'));
  assert.ok(!s('personel.marmara@karbon.com', 'users'));
  assert.ok(!s('personel.marmara@karbon.com', 'settings'));
});

test('kullanıcı kontrolleri', () => {
  const l = liste();
  const yeni = { id: 'x', adSoyad: 'Test', eposta: 'test@karbon.com', rol: 'personel', tesisler: [], aktif: true };
  assert.match(Kullanicilar.kullaniciKontrol(yeni, l, tesisIdleri), /en az 1 tesis/);
  assert.equal(Kullanicilar.kullaniciKontrol({ ...yeni, tesisler: ['demo_gida'] }, l, tesisIdleri), null);
  assert.match(Kullanicilar.kullaniciKontrol({ ...yeni, rol: 'tesis_muduru', tesisler: ['demo_gida', 'demo_otel'] }, l, tesisIdleri), /en fazla 1/);
  assert.match(Kullanicilar.kullaniciKontrol({ ...yeni, eposta: 'genelmudur@karbon.com', tesisler: ['demo_gida'] }, l, tesisIdleri), /başka bir kullanıcı/);
  assert.match(Kullanicilar.kullaniciKontrol({ ...yeni, eposta: 'gecersiz' }, l, tesisIdleri), /e-posta/);
  // Tek sistem yöneticisi pasif yapılamaz
  const yonetici = l.find((k) => k.rol === 'sistem_yoneticisi');
  assert.match(Kullanicilar.kullaniciKontrol({ ...yonetici, aktif: false }, l, tesisIdleri), /sistem yöneticisi/);
});

test('yayın dosyası kullanıcıları içerir, şifreleri açık metin içermez', () => {
  const y = Yayin.olustur(demo, new Date(2026, 10, 17));
  assert.equal(y.kullanicilar.length, liste().length);
  assert.ok(y.kullanicilar.every((k) => /^[0-9a-f]{64}$/.test(k.sifreOzeti)));
  assert.ok(!JSON.stringify(y).includes('123456'));
  assert.equal(y.tesisler.length, 8);
});
