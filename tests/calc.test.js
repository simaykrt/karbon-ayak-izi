const test = require('node:test');
const assert = require('node:assert/strict');

const Factors = require('../js/factors.js');
const Calc = require('../js/calc.js');
const Recommendations = require('../js/recommendations.js');
const Storage = require('../js/storage.js');

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

function sampleState() {
  const s = Storage.emptyState();
  s.facilities.push({ id: 'f1', name: 'Fabrika', type: 'Fabrika', employees: 10, area: 1000, productionUnit: 'ton', baseYear: 2024, targetYear: 2030, reductionTarget: 30 });
  s.facilities.push({ id: 'f2', name: 'Ofis', type: 'Şirket / Ofis', employees: 5, area: 200 });
  s.records.f1 = {};
  s.records.f2 = {};
  for (let m = 1; m <= 12; m++) {
    s.records.f1[Calc.monthKey(2024, m)] = { activity: { electricity: 1000, natural_gas: 100 }, production: 10 };
    s.records.f1[Calc.monthKey(2025, m)] = { activity: { electricity: 900, natural_gas: 100, electricity_renewable: 100 }, production: 10 };
    s.records.f2[Calc.monthKey(2025, m)] = { activity: { electricity: 100 } };
  }
  return s;
}

test('her kaynağın geçerli kapsamı ve faktörü var', () => {
  const keys = new Set();
  for (const s of Factors.SOURCES) {
    assert.ok([1, 2, 3].includes(s.scope), s.key);
    assert.ok(s.factor >= 0, s.key);
    assert.ok(!keys.has(s.key), 'tekrarlı anahtar ' + s.key);
    keys.add(s.key);
  }
});

test('recordEmissions faaliyet × faktör hesaplar ve kapsamlara ayırır', () => {
  const r = Calc.recordEmissions({ electricity: 1000, natural_gas: 100, waste_landfill: 10 });
  close(r.bySource.electricity, 442);
  close(r.bySource.natural_gas, 202);
  close(r.scopes[1], 202);
  close(r.scopes[2], 442);
  close(r.scopes[3], 4.67);
  close(r.total, 442 + 202 + 4.67);
});

test('özel faktör varsayılanın yerine geçer, virgüllü sayılar okunur', () => {
  const r = Calc.recordEmissions({ electricity: '1000,5' }, { electricity: 0.5 });
  close(r.total, 500.25);
});

test('negatif olmayan boş/geçersiz değerler sıfır sayılır', () => {
  const r = Calc.recordEmissions({ electricity: '', natural_gas: 'abc' });
  assert.equal(r.total, 0);
});

test('yıllık toplam ve tüm tesisler toplamı', () => {
  const s = sampleState();
  const y = Calc.aggregateYear(s, 'f1', 2025);
  assert.equal(y.total.monthsWithData, 12);
  close(y.total.total, 12 * (900 * 0.442 + 100 * 2.02));
  const all = Calc.aggregateYear(s, Calc.ALL, 2025);
  close(all.total.total, y.total.total + 12 * 100 * 0.442);
  assert.equal(all.total.activity.electricity, 12 * 1000);
});

test('kaynak bazlı karşılaştırma ve değişim yüzdesi', () => {
  const s = sampleState();
  const a = Calc.aggregateYear(s, 'f1', 2025).total;
  const b = Calc.aggregateYear(s, 'f1', 2024).total;
  const rows = Calc.compareBySource(a, b);
  const elec = rows.find((r) => r.key === 'electricity');
  close(elec.diff, -12 * 100 * 0.442);
  close(elec.pct, -10);
  assert.equal(Calc.change(5, 0).pct, null);
});

test('yoğunluk göstergeleri', () => {
  const s = sampleState();
  const y = Calc.aggregateYear(s, 'f1', 2025);
  const i = Calc.intensities(s, 'f1', y);
  close(i.perEmployee, y.total.total / 10);
  close(i.perProduction, y.total.total / 120);
  close(i.perArea, y.total.total / 1000);
});

test('hedef takibi doğrusal yörüngeyi kullanır', () => {
  const s = sampleState();
  const tp = Calc.targetProgress(s, 'f1', 2025);
  const base = Calc.aggregateYear(s, 'f1', 2024).total.total;
  close(tp.baseTotal, base);
  close(tp.targetValue, base * 0.7);
  close(tp.expected, base - base * 0.3 * (1 / 6));
  assert.equal(tp.onTrack, true);
});

test('öneriler üretilir ve potansiyeller pozitiftir', () => {
  const s = sampleState();
  const recs = Recommendations.generate(s, 'f1', 2025);
  const ids = recs.map((r) => r.id);
  assert.ok(ids.includes('efficiency'));
  assert.ok(ids.includes('renewable'));
  assert.ok(ids.includes('heat'));
  assert.ok(ids.includes('yoy-decrease'));
  for (const r of recs.filter((x) => x.type === 'action')) assert.ok(r.potential > 0, r.id);
});

test('veri yoksa bilgilendirme döner', () => {
  const s = sampleState();
  const recs = Recommendations.generate(s, 'f1', 2019);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].id, 'no-data');
});

test('CSV dışa ve içe aktarma birbirinin tersidir', () => {
  const s = sampleState();
  s.records.f1['2024-01'].note = 'bakım; "duruş"';
  const csv = Storage.recordsToCsv(s, 'f1');
  const back = Storage.csvToRecords(csv);
  assert.equal(Object.keys(back).length, 24);
  assert.deepEqual(back['2025-03'].activity, s.records.f1['2025-03'].activity);
  assert.equal(back['2024-01'].note, 'bakım; "duruş"');
  assert.equal(back['2024-01'].production, 10);
});

test('örnek veri tutarlı ve hesaplanabilir', () => {
  const demo = Storage.demoState(new Date(2026, 9, 4));
  assert.equal(demo.facilities.length, 2);
  const y = Calc.aggregateYear(demo, Calc.ALL, 2026);
  assert.equal(y.total.monthsWithData, 9);
  assert.ok(y.total.total > 0);
  const tp = Calc.targetProgress(demo, 'demo_fabrika', 2026);
  assert.ok(tp && !tp.incompleteBase);
});
