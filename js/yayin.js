/*
 * Mobil uygulama için yayın dosyası (yayin.json) üretir.
 *
 * Veri girişi ve hesaplamalar web uygulamasında yapılır; mobil uygulama bu
 * dosyadaki hazır sonuçları okuyarak yöneticilere özet gösterir.
 */
(function (global) {
  const isNode = typeof module === 'object' && module.exports;
  const Factors = isNode ? require('./factors.js') : global.KAI.Factors;
  const Calc = isNode ? require('./calc.js') : global.KAI.Calc;
  const Recommendations = isNode ? require('./recommendations.js') : global.KAI.Recommendations;

  const SURUM = 1;
  const round1 = (x) => Math.round(x * 10) / 10;

  function oneriDonustur(r) {
    return {
      baslik: r.title,
      metin: r.text,
      kategori: r.category,
      oncelik: r.priority,
      tur: r.type,
      potansiyel: r.potential ? round1(r.potential) : null,
    };
  }

  /** Bir tesisin aylık emisyon sonuçları: { "2025-01": { t, k: [k1, k2, k3], s: { kaynak: kg }, u } } */
  function aylikSonuclar(state, facilityId) {
    const recs = state.records[facilityId] || {};
    const out = {};
    for (const key of Object.keys(recs).sort()) {
      const r = Calc.recordEmissions(recs[key].activity, state.factorOverrides);
      const s = {};
      for (const [k, v] of Object.entries(r.bySource)) if (v > 0) s[k] = round1(v);
      out[key] = { t: round1(r.total), k: [1, 2, 3].map((x) => round1(r.scopes[x])), s, u: Calc.num(recs[key].production) };
    }
    return out;
  }

  function olustur(state, now) {
    const tarih = now || new Date();
    const years = Calc.yearsWithData(state, Calc.ALL);
    const raporYili = years.length ? years[years.length - 1] : tarih.getFullYear();
    const kaynaklar = {};
    for (const s of Factors.SOURCES) kaynaklar[s.key] = { ad: s.label, kapsam: s.scope, birim: s.unit };

    return {
      surum: SURUM,
      olusturma: tarih.toISOString(),
      raporYili,
      kaynaklar,
      tesisler: state.facilities.map((f) => ({
        id: f.id,
        ad: f.name,
        tur: f.type || '',
        sehir: f.city || '',
        calisan: Calc.num(f.employees),
        uretimBirimi: f.productionUnit || '',
        hedef: f.reductionTarget ? { bazYili: Number(f.baseYear), hedefYili: Number(f.targetYear), yuzde: Calc.num(f.reductionTarget) } : null,
        aylar: aylikSonuclar(state, f.id),
        oneriler: Recommendations.generate(state, f.id, raporYili).map(oneriDonustur),
      })),
      genelOneriler: state.facilities.length > 1 ? Recommendations.generate(state, Calc.ALL, raporYili).map(oneriDonustur) : [],
    };
  }

  const Yayin = { SURUM, olustur };

  if (isNode) module.exports = Yayin;
  else global.KAI = Object.assign(global.KAI || {}, { Yayin });
})(typeof window !== 'undefined' ? window : globalThis);
