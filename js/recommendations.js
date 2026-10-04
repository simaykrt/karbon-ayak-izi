/*
 * Azaltım önerileri motoru. Seçili tesis ve yılın emisyon dağılımına,
 * önceki yıla göre değişime, veri bütünlüğüne ve hedef durumuna bakarak
 * önceliklendirilmiş öneriler üretir. Tahmini azaltım potansiyelleri sektör
 * ortalamalarına dayalı kaba tahminlerdir (kgCO2e / yıl).
 */
(function (global) {
  const isNode = typeof module === 'object' && module.exports;
  const Factors = isNode ? require('./factors.js') : global.KAI.Factors;
  const Calc = isNode ? require('./calc.js') : global.KAI.Calc;
  const { SOURCE_MAP, MONTHS } = Factors;

  const fmt = (n, d) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const tons = (kg, d) => fmt(kg / 1000, d === undefined ? 2 : d);

  // Kaynak grubu bazlı kurallar: keys içindeki kaynakların emisyonunun "rate" kadarı azaltılabilir.
  const RULES = [
    {
      id: 'efficiency',
      keys: ['electricity'],
      rate: 0.12,
      category: 'Enerji verimliliği',
      title: 'Elektrik tüketiminde verimlilik',
      text: 'LED aydınlatmaya geçiş, motorlarda değişken hızlı sürücü (VSD), basınçlı hava kaçaklarının giderilmesi, verimli (IE3/IE4) motorlar ve enerji izleme sistemleri ile elektrik tüketimi tipik olarak %10–15 azaltılabilir. ISO 50001 Enerji Yönetim Sistemi bu çalışmaları sürekli hale getirir.',
    },
    {
      id: 'renewable',
      keys: ['electricity'],
      rate: 0.5,
      category: 'Yenilenebilir enerji',
      title: 'Yenilenebilir elektriğe geçiş',
      text: 'Çatı / arazi tipi GES kurulumu (öz tüketim), YEK-G veya I-REC belgeli yeşil elektrik tedariki ya da uzun dönemli yenilenebilir enerji alım anlaşmaları (PPA) ile Kapsam 2 emisyonları büyük ölçüde azaltılabilir. Hesapta tüketimin yarısının yenilenebilir kaynaklardan karşılanması varsayılmıştır.',
    },
    {
      id: 'heat',
      keys: ['natural_gas', 'lpg', 'district_heat'],
      rate: 0.15,
      category: 'Isıtma ve proses ısısı',
      title: 'Isıtma ve proses ısısında verimlilik',
      text: 'Bina ve boru hattı yalıtımı, kazan bakımı ve brülör ayarı, yoğuşmalı kazanlar, atık ısı geri kazanımı (ekonomizer, ısı eşanjörü) ve akıllı termostat/otomasyon ile yakıt tüketimi %10–20 düşürülebilir. Uygun proseslerde ısı pompalarıyla elektrifikasyon değerlendirilmelidir.',
    },
    {
      id: 'fuel_switch',
      keys: ['coal', 'fuel_oil'],
      rate: 0.4,
      category: 'Yakıt dönüşümü',
      title: 'Kömür / fuel-oil kullanımından çıkış',
      text: 'Kömür ve fuel-oil, birim enerji başına en yüksek emisyonlu yakıtlardır. Doğal gaza geçiş emisyonları yaklaşık %40 azaltır; ısı pompası, biyokütle veya yenilenebilir elektrikle elektrifikasyon ise daha yüksek azaltım sağlar.',
    },
    {
      id: 'generator',
      keys: ['diesel_stationary'],
      rate: 0.3,
      category: 'Yakıt dönüşümü',
      title: 'Jeneratör ve motorin kullanımını azaltma',
      text: 'Jeneratör kullanım saatlerini izleyin; kesintisiz güç ihtiyacı için batarya enerji depolama (BESS) ve GES kombinasyonunu değerlendirin. Motorinli kazanlar için doğal gaz veya ısı pompasına geçiş düşünülebilir.',
    },
    {
      id: 'fleet',
      keys: ['diesel_fleet', 'gasoline_fleet'],
      rate: 0.2,
      category: 'Ulaşım',
      title: 'Şirket filosunun dönüşümü',
      text: 'Rota optimizasyonu, araç takip sistemi, eko-sürüş eğitimi, düzenli lastik/bakım kontrolleri ve araç yenilemelerinde elektrikli veya hibrit araç tercihi ile filo emisyonları %15–30 azaltılabilir.',
    },
    {
      id: 'refrigerant',
      keys: ['ref_r410a', 'ref_r134a', 'ref_r404a', 'ref_r32'],
      rate: 0.5,
      category: 'Kaçak emisyonlar',
      title: 'Soğutucu gaz kaçaklarının önlenmesi',
      text: 'Soğutucu gazların küresel ısınma potansiyeli CO₂\'den binlerce kat yüksektir. Periyodik kaçak testleri, kaçak dedektörleri, yetkili servis bakımı ve sistem yenilemede düşük GWP\'li gazlara (R-32, R-290, R-744/CO₂, R-1234yf) geçiş önerilir.',
    },
    {
      id: 'waste',
      keys: ['waste_landfill'],
      rate: 0.5,
      category: 'Atık yönetimi',
      title: 'Depolanan atığı azaltma ve geri dönüşümü artırma',
      text: 'Kaynağında ayrıştırma, sıfır atık uygulamaları, organik atıkların kompostlanması ve tedarikçilerle ambalaj azaltımı ile düzenli depolamaya giden atık yarıya indirilebilir. Geri dönüştürülen atığın emisyon faktörü depolamaya göre çok daha düşüktür.',
      potential: (kg, overrides) => {
        // Depolanan atığın yarısı geri dönüşüme yönlendirilirse kazanılan fark.
        const amount = kg / (Calc.getFactor('waste_landfill', overrides) || 1);
        return amount * 0.5 * (Calc.getFactor('waste_landfill', overrides) - Calc.getFactor('waste_recycled', overrides));
      },
    },
    {
      id: 'flights',
      keys: ['flight_domestic', 'flight_international'],
      rate: 0.3,
      category: 'İş seyahatleri',
      title: 'İş seyahatlerini azaltma',
      text: 'Toplantılarda video konferansı öncelikli hale getirin, kısa mesafelerde uçak yerine tren tercih edin, seyahatleri birleştirin ve ekonomi sınıfında seyahat politikası uygulayın.',
    },
    {
      id: 'commute',
      keys: ['business_car', 'commute'],
      rate: 0.15,
      category: 'Ulaşım',
      title: 'Çalışan ulaşımı ve iş seyahati araçları',
      text: 'Servis güzergâhlarını optimize edin, toplu taşıma ve bisiklet kullanımını teşvik edin, hibrit/uzaktan çalışma günleri belirleyin, araç paylaşımını destekleyin.',
    },
    {
      id: 'freight',
      keys: ['freight_road'],
      rate: 0.2,
      category: 'Lojistik',
      title: 'Lojistikte karayolu bağımlılığını azaltma',
      text: 'Araç doluluk oranlarını artırın, boş dönüşleri azaltın, mümkün olan sevkiyatlarda demiryolu veya deniz yolu (intermodal) taşımaya geçin ve düşük emisyonlu filo kullanan lojistik firmalarıyla çalışın.',
    },
    {
      id: 'paper',
      keys: ['paper'],
      rate: 0.5,
      category: 'Ofis',
      title: 'Kâğıt tüketimini azaltma',
      text: 'E-imza, e-fatura ve dijital arşiv sistemlerine geçin; varsayılan çift taraflı yazdırma ayarlayın ve geri dönüştürülmüş kâğıt kullanın.',
    },
    {
      id: 'water',
      keys: ['water'],
      rate: 0.2,
      category: 'Su',
      title: 'Su verimliliği',
      text: 'Sensörlü/düşük debili armatürler, proses suyunun geri kazanımı, yağmur suyu hasadı ve kaçak kontrolleri ile su tüketimi azaltılabilir.',
    },
  ];

  function priorityFor(potential, total) {
    const share = total ? potential / total : 0;
    if (share >= 0.08) return 'yüksek';
    if (share >= 0.02) return 'orta';
    return 'düşük';
  }

  /**
   * @returns {Array<{id, type:'action'|'warning'|'info', priority, category, title, text, potential?}>}
   */
  function generate(state, facilityId, year) {
    const cur = Calc.aggregateYear(state, facilityId, year);
    const prev = Calc.aggregateYear(state, facilityId, year - 1);
    const total = cur.total.total;
    const overrides = state.factorOverrides;
    const out = [];

    if (!cur.total.monthsWithData) {
      return [
        {
          id: 'no-data',
          type: 'info',
          priority: 'orta',
          category: 'Veri',
          title: `${year} yılı için veri yok`,
          text: 'Öneri üretebilmek için "Veri Girişi" sayfasından aylık tüketim verilerini girin veya "Ayarlar" sayfasından örnek veriyi yükleyin.',
        },
      ];
    }

    // 1) Kaynak bazlı eylem önerileri
    for (const rule of RULES) {
      const kg = rule.keys.reduce((s, k) => s + (cur.total.bySource[k] || 0), 0);
      if (kg <= 0) continue;
      const potential = rule.potential ? rule.potential(kg, overrides) : kg * rule.rate;
      if (potential <= 0) continue;
      const share = total ? (kg / total) * 100 : 0;
      out.push({
        id: rule.id,
        type: 'action',
        priority: priorityFor(potential, total),
        category: rule.category,
        title: rule.title,
        text: rule.text,
        detail: `İlgili kaynakların ${year} emisyonu: ${tons(kg, 2)} tCO₂e (toplamın %${fmt(share, 1)}'i).`,
        potential,
      });
    }

    // 2) Yenilenebilir elektrik oranı
    const grid = cur.total.activity.electricity || 0;
    const green = cur.total.activity.electricity_renewable || 0;
    if (grid + green > 0) {
      const ratio = (green / (grid + green)) * 100;
      out.push({
        id: 'renewable-share',
        type: ratio >= 50 ? 'info' : 'warning',
        priority: ratio >= 50 ? 'düşük' : 'orta',
        category: 'Yenilenebilir enerji',
        title: `Yenilenebilir elektrik oranı: %${fmt(ratio, 1)}`,
        text:
          ratio >= 50
            ? 'Elektriğinizin yarısından fazlası yenilenebilir kaynaklardan sağlanıyor. Oranı %100\'e çıkarmak için PPA veya ek GES kapasitesi değerlendirilebilir.'
            : 'Elektrik tüketiminizde yenilenebilir payı düşük. Kısa vadede YEK-G belgeli tedarik, orta vadede GES yatırımı ile bu oran hızla artırılabilir.',
      });
    }

    // 3) Önceki yıla göre değişim
    if (prev.total.monthsWithData) {
      // Adil karşılaştırma için yalnızca her iki yılda da verisi olan aylar.
      let a = 0;
      let b = 0;
      const deltas = {};
      for (let i = 0; i < 12; i++) {
        if (!cur.months[i].hasData || !prev.months[i].hasData) continue;
        a += cur.months[i].total;
        b += prev.months[i].total;
        for (const k of new Set([...Object.keys(cur.months[i].bySource), ...Object.keys(prev.months[i].bySource)])) {
          deltas[k] = (deltas[k] || 0) + (cur.months[i].bySource[k] || 0) - (prev.months[i].bySource[k] || 0);
        }
      }
      if (b > 0) {
        const pct = ((a - b) / b) * 100;
        const rising = Object.entries(deltas)
          .filter(([, d]) => d > 0)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 3)
          .map(([k, d]) => `${SOURCE_MAP[k].label} (+${tons(d, 2)} t)`);
        if (pct > 2) {
          out.push({
            id: 'yoy-increase',
            type: 'warning',
            priority: pct > 10 ? 'yüksek' : 'orta',
            category: 'Trend',
            title: `Emisyonlar geçen yılın aynı dönemine göre %${fmt(pct, 1)} arttı`,
            text: `Artışa en çok katkı veren kaynaklar: ${rising.join(', ') || '—'}. Üretim artışı kaynaklı ise birim üretim başına yoğunluğu da takip edin.`,
          });
        } else if (pct < -2) {
          out.push({
            id: 'yoy-decrease',
            type: 'info',
            priority: 'düşük',
            category: 'Trend',
            title: `Emisyonlar geçen yılın aynı dönemine göre %${fmt(Math.abs(pct), 1)} azaldı`,
            text: 'İyi gidiyorsunuz. Azaltımı sağlayan uygulamaları belgeleyin ve diğer tesislere yaygınlaştırın.',
          });
        }
      }

      // Üretim yoğunluğu değişimi
      if (cur.total.production && prev.total.production) {
        const ci = cur.total.total / cur.total.production;
        const pi = prev.total.total / prev.total.production;
        const ip = ((ci - pi) / pi) * 100;
        if (ip > 3) {
          out.push({
            id: 'intensity-up',
            type: 'warning',
            priority: 'orta',
            category: 'Trend',
            title: `Birim üretim başına emisyon %${fmt(ip, 1)} arttı`,
            text: 'Üretim verimliliği düşmüş olabilir. Makine boşta çalışma süreleri, fire oranları ve kapasite kullanım oranını inceleyin.',
          });
        }
      }
    }

    // 4) Olağan dışı yüksek aylar
    const withData = cur.months.filter((m) => m.hasData);
    if (withData.length >= 3) {
      const avg = withData.reduce((s, m) => s + m.total, 0) / withData.length;
      const peaks = withData.filter((m) => m.total > avg * 1.3);
      if (peaks.length) {
        out.push({
          id: 'peaks',
          type: 'warning',
          priority: 'orta',
          category: 'Trend',
          title: 'Olağan dışı yüksek emisyonlu aylar',
          text: `${peaks.map((m) => MONTHS[m.month - 1]).join(', ')} aylarında emisyon yıllık ortalamanın %30'undan fazla üzerinde. Bu aylardaki tüketimleri (ısıtma/soğutma, bakım, kaçak dolumları) inceleyin.`,
        });
      }
    }

    // 5) Veri bütünlüğü
    const now = new Date();
    const expectedMonths = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() : 0;
    const missing = [];
    for (let i = 0; i < expectedMonths; i++) if (!cur.months[i].hasData) missing.push(MONTHS[i]);
    if (missing.length) {
      out.push({
        id: 'missing',
        type: 'warning',
        priority: 'orta',
        category: 'Veri',
        title: `${missing.length} ayın verisi eksik`,
        text: `Eksik aylar: ${missing.join(', ')}. Doğru raporlama ve karşılaştırma için tüm ayların verisini girin.`,
      });
    }

    // 6) Hedef takibi
    const tp = Calc.targetProgress(state, facilityId, year);
    if (tp && !tp.incompleteBase && tp.current !== null) {
      out.push({
        id: 'target',
        type: tp.onTrack ? 'info' : 'warning',
        priority: tp.onTrack ? 'düşük' : 'yüksek',
        category: 'Hedef',
        title: tp.onTrack ? 'Azaltım hedefi yolunda' : 'Azaltım hedefinin gerisindesiniz',
        text: `${tp.baseYear} baz yılına göre ${tp.targetYear} için %${tp.pct} azaltım hedefi var. ${year} için beklenen seviye ${tons(tp.expected, 1)} tCO₂e, yıllıklandırılmış mevcut seviye ${tons(tp.current, 1)} tCO₂e.`,
      });
    }

    // 7) Uyum / raporlama bilgilendirmeleri
    const f = Calc.facilityInfo(state, facilityId);
    if (f && f.type === 'Fabrika') {
      out.push({
        id: 'cbam',
        type: 'info',
        priority: 'düşük',
        category: 'Mevzuat',
        title: 'SKDM (AB Sınırda Karbon Düzenleme Mekanizması)',
        text: 'AB\'ye demir-çelik, alüminyum, çimento, gübre, hidrojen veya elektrik ihraç ediyorsanız ürün bazlı gömülü emisyonları raporlamanız gerekir. Üretim miktarını aylık girerek birim ürün başına emisyonu takip edin.',
      });
    }
    if (total / 1000 > 1000) {
      out.push({
        id: 'mrv',
        type: 'info',
        priority: 'düşük',
        category: 'Mevzuat',
        title: 'Doğrulanmış sera gazı raporlaması',
        text: 'Yıllık emisyonunuz 1.000 tCO₂e\'nin üzerinde. İklim Kanunu kapsamındaki İzleme, Raporlama ve Doğrulama (İRD) yükümlülükleri ve Türkiye Emisyon Ticaret Sistemi için ISO 14064-1 uyumlu envanter ve üçüncü taraf doğrulaması planlayın.',
      });
    }

    const order = { yüksek: 0, orta: 1, düşük: 2 };
    return out.sort((x, y) => order[x.priority] - order[y.priority] || (y.potential || 0) - (x.potential || 0));
  }

  const Recommendations = { RULES, generate };

  if (isNode) module.exports = Recommendations;
  else global.KAI = Object.assign(global.KAI || {}, { Recommendations });
})(typeof window !== 'undefined' ? window : globalThis);
