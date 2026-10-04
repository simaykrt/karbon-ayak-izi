/*
 * Hesaplama motoru: aylık / yıllık emisyonlar, karşılaştırmalar, yoğunluk
 * göstergeleri ve azaltım hedefi takibi. Tüm emisyon değerleri kgCO2e'dir.
 */
(function (global) {
  const Factors = typeof module === 'object' && module.exports ? require('./factors.js') : global.KAI.Factors;
  const { SOURCES, SOURCE_MAP } = Factors;

  const ALL = '__all__';

  function num(v) {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  function getFactor(key, overrides) {
    if (overrides && overrides[key] !== undefined && overrides[key] !== null && overrides[key] !== '') {
      return num(overrides[key]);
    }
    return SOURCE_MAP[key] ? SOURCE_MAP[key].factor : 0;
  }

  function emptyResult() {
    return { bySource: {}, scopes: { 1: 0, 2: 0, 3: 0 }, total: 0 };
  }

  /** Tek bir aylık faaliyet kaydının emisyonlarını hesaplar. */
  function recordEmissions(activity, overrides) {
    const res = emptyResult();
    if (!activity) return res;
    for (const src of SOURCES) {
      const amount = num(activity[src.key]);
      if (!amount) continue;
      const kg = amount * getFactor(src.key, overrides);
      res.bySource[src.key] = (res.bySource[src.key] || 0) + kg;
      res.scopes[src.scope] += kg;
      res.total += kg;
    }
    return res;
  }

  function addInto(target, r) {
    for (const k of Object.keys(r.bySource)) target.bySource[k] = (target.bySource[k] || 0) + r.bySource[k];
    for (const s of [1, 2, 3]) target.scopes[s] += r.scopes[s];
    target.total += r.total;
  }

  function facilityIds(state, facilityId) {
    if (facilityId === ALL) return state.facilities.map((f) => f.id);
    return [facilityId];
  }

  /**
   * Bir tesis (veya tüm tesisler) için bir yılın 12 aylık dökümünü ve yıllık
   * toplamını döndürür.
   */
  function aggregateYear(state, facilityId, year) {
    const months = [];
    const yearTotal = Object.assign(emptyResult(), { production: 0, activity: {}, monthsWithData: 0 });
    const ids = facilityIds(state, facilityId);

    for (let m = 1; m <= 12; m++) {
      const month = Object.assign(emptyResult(), { month: m, hasData: false, production: 0, activity: {} });
      for (const id of ids) {
        const rec = state.records[id] && state.records[id][monthKey(year, m)];
        if (!rec) continue;
        month.hasData = true;
        month.production += num(rec.production);
        for (const [k, v] of Object.entries(rec.activity || {})) {
          month.activity[k] = (month.activity[k] || 0) + num(v);
        }
        addInto(month, recordEmissions(rec.activity, state.factorOverrides));
      }
      months.push(month);
      if (month.hasData) {
        yearTotal.monthsWithData++;
        yearTotal.production += month.production;
        for (const [k, v] of Object.entries(month.activity)) yearTotal.activity[k] = (yearTotal.activity[k] || 0) + v;
        addInto(yearTotal, month);
      }
    }
    return { year, months, total: yearTotal };
  }

  /** Belirli bir ayın sonucunu döndürür. */
  function aggregateMonth(state, facilityId, year, month) {
    return aggregateYear(state, facilityId, year).months[month - 1];
  }

  function change(current, previous) {
    const diff = current - previous;
    const pct = previous ? (diff / previous) * 100 : null;
    return { current, previous, diff, pct };
  }

  /** Kaynak bazında iki sonucu karşılaştırır (büyükten küçüğe mutlak farka göre). */
  function compareBySource(a, b) {
    const keys = new Set([...Object.keys(a.bySource), ...Object.keys(b.bySource)]);
    return [...keys]
      .map((key) => Object.assign({ key, source: SOURCE_MAP[key] }, change(a.bySource[key] || 0, b.bySource[key] || 0)))
      .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  }

  function facilityInfo(state, facilityId) {
    if (facilityId === ALL) {
      const fs = state.facilities;
      return {
        id: ALL,
        name: 'Tüm tesisler',
        employees: fs.reduce((s, f) => s + num(f.employees), 0),
        area: fs.reduce((s, f) => s + num(f.area), 0),
        productionUnit: fs.length && fs.every((f) => f.productionUnit === fs[0].productionUnit) ? fs[0].productionUnit : '',
      };
    }
    return state.facilities.find((f) => f.id === facilityId) || null;
  }

  /** Yoğunluk göstergeleri: çalışan başına, m² başına, üretim birimi başına. */
  function intensities(state, facilityId, yearAgg) {
    const f = facilityInfo(state, facilityId) || {};
    const t = yearAgg.total;
    // Eksik aylar varsa çalışan / alan yoğunluğunu yıllığa ölçekleme yapmadan, girilen aylara göre oranla.
    const monthFactor = t.monthsWithData ? 12 / t.monthsWithData : 0;
    return {
      perEmployee: num(f.employees) ? (t.total * monthFactor) / num(f.employees) : null,
      perArea: num(f.area) ? (t.total * monthFactor) / num(f.area) : null,
      perProduction: t.production ? t.total / t.production : null,
      productionUnit: f.productionUnit || '',
      annualized: monthFactor > 1,
    };
  }

  /**
   * Azaltım hedefi takibi. Tesisin baz yılı, hedef yılı ve hedef azaltım
   * yüzdesine göre doğrusal bir yörünge çizer ve seçili yılın durumunu verir.
   */
  function targetProgress(state, facilityId, year) {
    const f = facilityInfo(state, facilityId);
    if (!f || facilityId === ALL) return null;
    const baseYear = parseInt(f.baseYear, 10);
    const targetYear = parseInt(f.targetYear, 10);
    const pct = num(f.reductionTarget);
    if (!baseYear || !targetYear || !pct || targetYear <= baseYear) return null;
    const base = aggregateYear(state, facilityId, baseYear).total;
    if (!base.total || base.monthsWithData < 12) {
      return { baseYear, targetYear, pct, incompleteBase: true, baseMonths: base.monthsWithData };
    }
    const targetValue = base.total * (1 - pct / 100);
    const progressRatio = Math.min(Math.max((year - baseYear) / (targetYear - baseYear), 0), 1);
    const expected = base.total - (base.total - targetValue) * progressRatio;
    const cur = aggregateYear(state, facilityId, year).total;
    const annualized = cur.monthsWithData ? (cur.total * 12) / cur.monthsWithData : null;
    const achievedPct = annualized !== null ? ((base.total - annualized) / base.total) * 100 : null;
    return {
      baseYear,
      targetYear,
      pct,
      baseTotal: base.total,
      targetValue,
      expected,
      current: annualized,
      currentMonths: cur.monthsWithData,
      achievedPct,
      onTrack: annualized !== null ? annualized <= expected : null,
    };
  }

  /** Kaydı olan tüm yılları döndürür. */
  function yearsWithData(state, facilityId) {
    const years = new Set();
    for (const id of facilityIds(state, facilityId)) {
      for (const k of Object.keys(state.records[id] || {})) years.add(parseInt(k.slice(0, 4), 10));
    }
    return [...years].sort((a, b) => a - b);
  }

  /** Toplamı en yüksek kaynakları sıralar. */
  function topSources(result, limit) {
    return Object.entries(result.bySource)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit || Infinity)
      .map(([key, kg]) => ({ key, kg, source: SOURCE_MAP[key], share: result.total ? kg / result.total : 0 }));
  }

  const Calc = {
    ALL,
    num,
    monthKey,
    getFactor,
    recordEmissions,
    aggregateYear,
    aggregateMonth,
    change,
    compareBySource,
    facilityInfo,
    intensities,
    targetProgress,
    yearsWithData,
    topSources,
  };

  if (typeof module === 'object' && module.exports) module.exports = Calc;
  else global.KAI = Object.assign(global.KAI || {}, { Calc });
})(typeof window !== 'undefined' ? window : globalThis);
