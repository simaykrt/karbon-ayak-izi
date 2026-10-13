/*
 * Veri saklama (tarayıcı localStorage), içe/dışa aktarma ve örnek veri üretimi.
 */
(function (global) {
  const isNode = typeof module === 'object' && module.exports;
  const Calc = isNode ? require('./calc.js') : global.KAI.Calc;
  const Factors = isNode ? require('./factors.js') : global.KAI.Factors;

  const STORAGE_KEY = 'karbonAyakIzi.v1';

  function emptyState() {
    return { version: 1, facilities: [], records: {}, factorOverrides: {} };
  }

  function normalize(data) {
    const s = emptyState();
    if (!data || typeof data !== 'object') return s;
    s.facilities = Array.isArray(data.facilities) ? data.facilities.filter((f) => f && f.id) : [];
    s.records = data.records && typeof data.records === 'object' ? data.records : {};
    s.factorOverrides = data.factorOverrides && typeof data.factorOverrides === 'object' ? data.factorOverrides : {};
    if (data.demo) s.demo = true;
    return s;
  }

  function load() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : emptyState();
    } catch (e) {
      console.warn('Veri okunamadı:', e);
      return emptyState();
    }
  }

  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('Veri kaydedilemedi:', e);
      return false;
    }
  }

  function uid() {
    return 'f_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  /** Aylık faaliyet verilerini CSV'ye çevirir (ay;kaynak1;kaynak2;...;uretim;not). */
  function recordsToCsv(state, facilityId) {
    const keys = Factors.SOURCES.map((s) => s.key);
    const header = ['ay', ...keys, 'uretim', 'not'];
    const recs = state.records[facilityId] || {};
    const rows = Object.keys(recs)
      .sort()
      .map((month) => {
        const r = recs[month];
        return [
          month,
          ...keys.map((k) => (r.activity && r.activity[k] ? String(r.activity[k]) : '')),
          r.production ? String(r.production) : '',
          '"' + String(r.note || '').replace(/"/g, '""') + '"',
        ].join(';');
      });
    return [header.join(';'), ...rows].join('\n');
  }

  /** CSV'den aylık kayıtları okur. Ayraç olarak ; veya , kabul edilir. */
  function csvToRecords(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new Error('CSV dosyasında veri satırı bulunamadı.');
    const sep = lines[0].includes(';') ? ';' : ',';
    const split = (line) => {
      const out = [];
      let cur = '';
      let q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (q) {
          if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (c === '"') q = false;
          else cur += c;
        } else if (c === '"') q = true;
        else if (c === sep) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur);
      return out.map((v) => v.trim());
    };
    const header = split(lines[0]).map((h) => h.toLowerCase());
    const monthIdx = header.indexOf('ay');
    if (monthIdx < 0) throw new Error('CSV başlığında "ay" sütunu bulunmalı (ör. 2025-01).');
    const result = {};
    for (const line of lines.slice(1)) {
      const cells = split(line);
      const month = cells[monthIdx];
      if (!/^\d{4}-\d{2}$/.test(month)) continue;
      const rec = { activity: {}, production: 0, note: '' };
      header.forEach((h, i) => {
        const v = cells[i];
        if (v === undefined || v === '') return;
        if (Factors.SOURCE_MAP[h]) rec.activity[h] = Calc.num(v);
        else if (h === 'uretim') rec.production = Calc.num(v);
        else if (h === 'not') rec.note = v;
      });
      result[month] = rec;
    }
    return result;
  }

  // Deterministik sözde-rastgele üreteç (örnek veri her seferinde aynı olsun).
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /** Dört tesis için son üç yılın gerçekçi örnek verisini üretir. */
  function demoState(today) {
    const now = today || new Date();
    const thisYear = now.getFullYear();
    const lastFullMonth = now.getMonth(); // içinde bulunulan aydan önceki ay sayısı
    const s = emptyState();
    s.demo = true;
    const factory = {
      id: 'demo_fabrika',
      name: 'Gebze Üretim Tesisi',
      type: 'Fabrika',
      sector: 'Metal eşya imalatı',
      city: 'Kocaeli',
      employees: 420,
      area: 28000,
      productionUnit: 'ton ürün',
      baseYear: thisYear - 2,
      reductionTarget: 30,
      targetYear: thisYear + 4,
    };
    const office = {
      id: 'demo_ofis',
      name: 'İstanbul Genel Merkez',
      type: 'Şirket / Ofis',
      sector: 'Yönetim ve satış',
      city: 'İstanbul',
      employees: 135,
      area: 4200,
      productionUnit: '',
      baseYear: thisYear - 2,
      reductionTarget: 40,
      targetYear: thisYear + 4,
    };
    const textile = {
      id: 'demo_tekstil',
      name: 'Bursa Dokuma ve Boyahane',
      type: 'Fabrika',
      sector: 'Tekstil (dokuma, boya, apre)',
      city: 'Bursa',
      employees: 310,
      area: 21000,
      productionUnit: 'ton kumaş',
      baseYear: thisYear - 2,
      reductionTarget: 35,
      targetYear: thisYear + 4,
    };
    const depot = {
      id: 'demo_depo',
      name: 'İzmir Soğuk Hava Deposu',
      type: 'Depo / Lojistik',
      sector: 'Gıda lojistiği',
      city: 'İzmir',
      employees: 85,
      area: 18000,
      productionUnit: 'palet',
      baseYear: '',
      reductionTarget: '',
      targetYear: '',
    };
    s.facilities.push(factory, textile, depot, office);
    for (const f of s.facilities) s.records[f.id] = {};

    const rand = rng(42);
    const jitter = (v, p) => Math.round(v * (1 + (rand() - 0.5) * 2 * (p || 0.06)));
    // Mevsimsellik: kış aylarında ısıtma, yaz aylarında soğutma yükü.
    const heating = [1.6, 1.5, 1.2, 0.8, 0.45, 0.25, 0.2, 0.2, 0.35, 0.7, 1.15, 1.5];
    const cooling = [0.9, 0.9, 0.95, 1.0, 1.05, 1.2, 1.3, 1.3, 1.1, 1.0, 0.92, 0.9];

    for (let y = thisYear - 2; y <= thisYear; y++) {
      const age = y - (thisYear - 2); // 0, 1, 2 — yıllar içinde iyileştirmeler
      for (let m = 1; m <= 12; m++) {
        if (y === thisYear && m > lastFullMonth) break;
        const i = m - 1;
        const prod = jitter(1150 * (1 + age * 0.04), 0.08);
        const renewShare = [0.05, 0.18, 0.35][age];
        const elecTotal = jitter(prod * 820 * cooling[i] * (1 - age * 0.04));
        s.records[factory.id][Calc.monthKey(y, m)] = {
          production: prod,
          note: '',
          activity: {
            electricity: Math.round(elecTotal * (1 - renewShare)),
            electricity_renewable: Math.round(elecTotal * renewShare),
            natural_gas: jitter(prod * 95 * (0.5 + heating[i] * 0.5) * (1 - age * 0.06)),
            diesel_stationary: jitter(age === 0 ? 900 : 600),
            diesel_fleet: jitter(4200 * (1 - age * 0.05)),
            lpg: jitter(1800),
            ref_r410a: m === 7 ? (age === 0 ? 18 : 8) : 0,
            ref_r404a: m === 8 && age === 0 ? 12 : 0,
            water: jitter(prod * 3.1),
            waste_landfill: jitter(38000 * (1 - age * 0.15)),
            waste_recycled: jitter(52000 * (1 + age * 0.12)),
            freight_road: jitter(prod * 420),
            freight_sea: jitter(prod * 900),
            commute: jitter(420 * 22 * 2 * 14),
            flight_domestic: jitter(6000, 0.4),
          },
        };
        const officeRenew = [0, 0.3, 0.6][age];
        const officeElec = jitter(48000 * cooling[i] * (1 - age * 0.05));
        s.records[office.id][Calc.monthKey(y, m)] = {
          production: 0,
          note: '',
          activity: {
            electricity: Math.round(officeElec * (1 - officeRenew)),
            electricity_renewable: Math.round(officeElec * officeRenew),
            natural_gas: jitter(5200 * heating[i] * (1 - age * 0.08)),
            gasoline_fleet: jitter(1900 * (1 - age * 0.1)),
            ref_r410a: m === 6 && age < 2 ? 6 : 0,
            water: jitter(620),
            waste_landfill: jitter(2600 * (1 - age * 0.2)),
            waste_recycled: jitter(1500 * (1 + age * 0.2)),
            paper: jitter(780 * (1 - age * 0.2)),
            flight_domestic: jitter(42000 * (1 - age * 0.1), 0.3),
            flight_international: jitter(95000 * (1 - age * 0.15), 0.35),
            business_car: jitter(14000, 0.2),
            commute: jitter(135 * 21 * 2 * 18 * (1 - age * 0.08)),
          },
        };

        // Tekstil: buhar kazanında kömür kullanılıyor; son yıl kısmen doğal gaza geçilmiş.
        const tProd = jitter(380 * (age === 2 && m === 8 ? 0.55 : 1), 0.07);
        const coalShare = [1, 1, 0.45][age];
        s.records[textile.id][Calc.monthKey(y, m)] = {
          production: tProd,
          note: age === 2 && m === 8 ? 'Yıllık bakım duruşu (2 hafta)' : age === 2 && m === 3 ? 'Kömür kazanı yerine doğal gaz kazanı devreye alındı' : '',
          activity: {
            electricity: jitter(tProd * 2100 * cooling[i]),
            coal: Math.round(tProd * 0.16 * coalShare * (0.85 + heating[i] * 0.1) * 10) / 10,
            natural_gas: jitter(tProd * (180 + (1 - coalShare) * 330) * (0.8 + heating[i] * 0.2)),
            fuel_oil: age === 0 ? jitter(2500) : 0,
            diesel_fleet: jitter(1600),
            water: jitter(tProd * 95 * (1 - age * 0.07)),
            waste_landfill: jitter(tProd * 55 * (1 - age * 0.1)),
            waste_recycled: jitter(tProd * 40 * (1 + age * 0.15)),
            freight_road: jitter(tProd * 300),
            freight_sea: jitter(tProd * 2600),
            commute: jitter(310 * 22 * 2 * 11),
          },
        };

        // Soğuk hava deposu: soğutma yükü yazın artıyor, R-404A kaçakları sık.
        const pallets = jitter(5200 * (1 + age * 0.06), 0.1);
        s.records[depot.id][Calc.monthKey(y, m)] = {
          production: pallets,
          note: m === 7 && age === 1 ? 'Kompresör arızası, soğutucu gaz takviyesi yapıldı' : '',
          activity: {
            electricity: jitter(98000 * cooling[i] * cooling[i]),
            diesel_stationary: jitter(m >= 6 && m <= 8 ? 700 : 250),
            diesel_fleet: jitter(9800 * (1 + age * 0.04)),
            lpg: jitter(1300),
            ref_r404a: m === 7 && age === 1 ? 34 : m % 4 === 0 ? 6 : 0,
            water: jitter(240),
            waste_landfill: jitter(5200),
            waste_recycled: jitter(3100 * (1 + age * 0.1)),
            freight_road: jitter(pallets * 120),
            commute: jitter(85 * 24 * 2 * 15),
          },
        };
      }
    }
    // Birkaç gerçekçi açıklama notu
    const fk = s.records[factory.id];
    if (fk[Calc.monthKey(thisYear - 1, 4)]) fk[Calc.monthKey(thisYear - 1, 4)].note = 'Çatı GES (1,2 MWp) devreye alındı';
    if (fk[Calc.monthKey(thisYear, 2)]) fk[Calc.monthKey(thisYear, 2)].note = 'Basınçlı hava kaçak taraması yapıldı';
    return s;
  }

  const Storage = { STORAGE_KEY, emptyState, normalize, load, save, uid, recordsToCsv, csvToRecords, demoState };

  if (isNode) module.exports = Storage;
  else global.KAI = Object.assign(global.KAI || {}, { Storage });
})(typeof window !== 'undefined' ? window : globalThis);
