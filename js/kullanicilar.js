/*
 * Kullanıcılar, roller ve yetkiler.
 *
 * Şifreler açık metin olarak saklanmaz; e-posta ile birlikte SHA-256 özeti
 * tutulur. Uygulamanın sunucusu olmadığı için bu giriş sistemi gerçek bir
 * güvenlik sağlamaz, rollere göre ekranları ayırmak için kullanılır.
 */
(function (global) {
  const isNode = typeof module === 'object' && module.exports;

  const KULLANICI_ANAHTARI = 'karbonAyakIzi.kullanicilar';
  const OTURUM_ANAHTARI = 'karbonAyakIzi.oturum';

  // sekmeler: web uygulamasında açılabilen sayfalar
  // tesis: 'hepsi' tüm tesisler, 'atanan' yalnızca kullanıcıya atanan tesisler
  const ROLLER = {
    sistem_yoneticisi: {
      ad: 'Sistem yöneticisi',
      aciklama: 'Kullanıcıları, rolleri ve tesis atamalarını yönetir; tüm sayfalara erişir.',
      sekmeler: ['dashboard', 'entry', 'compare', 'recommendations', 'facilities', 'report', 'settings', 'users'],
      tesis: 'hepsi',
      tesisSayisi: [0, 0],
    },
    personel: {
      ad: 'Personel',
      aciklama: 'Kendisine atanan tesisler için aylık veri girer.',
      sekmeler: ['dashboard', 'entry', 'compare', 'recommendations', 'report'],
      tesis: 'atanan',
      tesisSayisi: [1, Infinity],
    },
    genel_mudur: {
      ad: 'Genel müdür',
      aciklama: 'Tüm tesislerin sonuçlarını izler (mobil uygulama).',
      sekmeler: ['dashboard', 'compare', 'recommendations', 'report'],
      tesis: 'hepsi',
      tesisSayisi: [0, 0],
    },
    tesis_muduru: {
      ad: 'Tesis müdürü',
      aciklama: 'Kendi tesisinin sonuçlarını izler (mobil uygulama).',
      sekmeler: ['dashboard', 'compare', 'recommendations', 'report'],
      tesis: 'atanan',
      tesisSayisi: [1, 1],
    },
  };

  // Demo hesaplar; hepsinin şifresi 123456
  const VARSAYILAN = [
    ['k_yonetici', 'Deniz Aydın', 'yonetici@karbon.com', 'sistem_yoneticisi', [], 'd29c6b2000acc6f5b4bcf05bb1b089476c48b1dda69817c129e43a9f5b4a6080'],
    ['k_genelmudur', 'Ayşe Yılmaz', 'genelmudur@karbon.com', 'genel_mudur', [], 'f049411170f08c36cb0f670bddeecc90a168f5439e9845c93632e20b23a09efe'],
    ['k_gebze', 'Mehmet Kaya', 'gebze.mudur@karbon.com', 'tesis_muduru', ['demo_fabrika'], '8b002b0944771e4022d78fb6449ea518b390589bfcc3421945839258506c5a4c'],
    ['k_antalya', 'Selin Koç', 'antalya.mudur@karbon.com', 'tesis_muduru', ['demo_otel'], '1be2aeeed5628a429097c0641d1743ce467c8a9b76deb94c37e9c73306958a95'],
    ['k_marmara', 'Can Öztürk', 'personel.marmara@karbon.com', 'personel', ['demo_fabrika', 'demo_tekstil', 'demo_ofis'], 'ba4f2744088f1e8db01774b6a7e9b24e6098efa25f97c30270fff887741895a7'],
    ['k_ege', 'Elif Şahin', 'personel.ege@karbon.com', 'personel', ['demo_depo', 'demo_otel'], '6413e8937ed25ccf1228cd483b7d2073bfc94f41ce70882eca1e7d4dead7e023'],
    ['k_anadolu', 'Burak Çelik', 'personel.anadolu@karbon.com', 'personel', ['demo_gida', 'demo_lojistik', 'demo_ankara'], '6419b60291b03e3b2cf1fee5b12147e20830b0bb80fd4693c7aceb3e41a56d07'],
  ];

  function varsayilanKullanicilar() {
    return VARSAYILAN.map(([id, adSoyad, eposta, rol, tesisler, sifreOzeti]) => ({ id, adSoyad, eposta, rol, tesisler: tesisler.slice(), aktif: true, sifreOzeti }));
  }

  const epostaNormal = (e) => String(e || '').trim().toLowerCase();

  /** SHA-256(karbon-ayak-izi|eposta|şifre), onaltılık metin. Mobil uygulama da aynı yöntemi kullanır. */
  async function sifreOzeti(eposta, sifre) {
    const metin = `karbon-ayak-izi|${epostaNormal(eposta)}|${sifre}`;
    if (isNode) return require('crypto').createHash('sha256').update(metin).digest('hex');
    const veri = new TextEncoder().encode(metin);
    const ozet = await global.crypto.subtle.digest('SHA-256', veri);
    return [...new Uint8Array(ozet)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Giriş denemesi: { kullanici } ya da { hata } döner. */
  async function girisDogrula(kullanicilar, eposta, sifre) {
    const k = kullanicilar.find((x) => epostaNormal(x.eposta) === epostaNormal(eposta));
    if (!k || k.sifreOzeti !== (await sifreOzeti(eposta, sifre))) return { hata: 'E-posta veya şifre hatalı.' };
    if (!k.aktif) return { hata: 'Bu hesap pasif durumda. Sistem yöneticisine başvurun.' };
    return { kullanici: k };
  }

  /** Kullanıcının görebildiği tesislerin kimlikleri. */
  function izinliTesisler(kullanici, tesisler) {
    const rol = ROLLER[kullanici.rol];
    if (!rol) return [];
    const hepsi = tesisler.map((t) => t.id);
    return rol.tesis === 'hepsi' ? hepsi : hepsi.filter((id) => (kullanici.tesisler || []).includes(id));
  }

  function sekmeIzinli(kullanici, sekme) {
    const rol = ROLLER[kullanici.rol];
    return !!rol && rol.sekmeler.includes(sekme);
  }

  /** Yeni ya da düzenlenen kullanıcıyı kontrol eder; sorun varsa açıklamasını döner. */
  function kullaniciKontrol(k, liste, tesisIdleri) {
    if (!String(k.adSoyad || '').trim()) return 'Ad soyad zorunludur.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epostaNormal(k.eposta))) return 'Geçerli bir e-posta adresi girin.';
    if (liste.some((x) => x.id !== k.id && epostaNormal(x.eposta) === epostaNormal(k.eposta))) return 'Bu e-posta adresiyle kayıtlı başka bir kullanıcı var.';
    const rol = ROLLER[k.rol];
    if (!rol) return 'Geçerli bir rol seçin.';
    const atanan = (k.tesisler || []).filter((id) => tesisIdleri.includes(id));
    const [en_az, en_cok] = rol.tesisSayisi;
    if (atanan.length < en_az) return `${rol.ad} için en az ${en_az} tesis seçilmelidir.`;
    if (atanan.length > en_cok) return en_cok === 0 ? `${rol.ad} rolüne tesis atanmaz.` : `${rol.ad} için en fazla ${en_cok} tesis seçilebilir.`;
    const yoneticiKalir = liste.some((x) => x.id !== k.id && x.rol === 'sistem_yoneticisi' && x.aktif) || (k.rol === 'sistem_yoneticisi' && k.aktif);
    if (!yoneticiKalir) return 'En az bir aktif sistem yöneticisi kalmalıdır.';
    return null;
  }

  function yukle() {
    try {
      const ham = global.localStorage && global.localStorage.getItem(KULLANICI_ANAHTARI);
      const liste = ham ? JSON.parse(ham) : null;
      if (Array.isArray(liste) && liste.length) return liste;
    } catch (e) {
      console.warn('Kullanıcılar okunamadı:', e);
    }
    return varsayilanKullanicilar();
  }

  function kaydet(liste) {
    try {
      global.localStorage.setItem(KULLANICI_ANAHTARI, JSON.stringify(liste));
      return true;
    } catch (e) {
      return false;
    }
  }

  function oturumOku() {
    try {
      return global.sessionStorage.getItem(OTURUM_ANAHTARI) || global.localStorage.getItem(OTURUM_ANAHTARI);
    } catch (e) {
      return null;
    }
  }

  function oturumYaz(id, hatirla) {
    try {
      global.sessionStorage.setItem(OTURUM_ANAHTARI, id);
      if (hatirla) global.localStorage.setItem(OTURUM_ANAHTARI, id);
    } catch (e) { /* oturum yalnızca bu sayfa açıkken sürer */ }
  }

  function oturumSil() {
    try {
      global.sessionStorage.removeItem(OTURUM_ANAHTARI);
      global.localStorage.removeItem(OTURUM_ANAHTARI);
    } catch (e) { /* yok sayılır */ }
  }

  const Kullanicilar = {
    ROLLER, varsayilanKullanicilar, sifreOzeti, girisDogrula, izinliTesisler, sekmeIzinli, kullaniciKontrol,
    yukle, kaydet, oturumOku, oturumYaz, oturumSil,
  };

  if (isNode) module.exports = Kullanicilar;
  else global.KAI = Object.assign(global.KAI || {}, { Kullanicilar });
})(typeof window !== 'undefined' ? window : globalThis);
