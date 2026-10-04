/*
 * Uygulama arayüzü: sayfaların oluşturulması, olaylar ve grafikler.
 */
(function () {
  'use strict';

  const { Factors, Calc, Recommendations, Storage } = window.KAI;
  const { SOURCES, SOURCE_MAP, SCOPES, MONTHS, MONTHS_SHORT, FACILITY_TYPES } = Factors;
  const ALL = Calc.ALL;

  let state = Storage.load();
  const now = new Date();
  const ui = {
    view: 'dashboard',
    facility: null,
    year: now.getFullYear(),
    entryMonth: null,
    editingFacility: null,
    cmp: {},
  };
  const charts = {};

  // ---------------------------------------------------------------- yardımcılar

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function fmt(n, d) {
    const digits = d === undefined ? 0 : d;
    return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  /** kg → ton gösterimi */
  const t = (kg, d) => fmt(kg / 1000, d === undefined ? 2 : d);

  function pctHtml(pct, invert) {
    if (pct === null || pct === undefined || !Number.isFinite(pct)) return '<span class="muted">—</span>';
    if (Math.abs(pct) < 0.05) return '%0,0';
    const bad = invert ? pct < 0 : pct > 0;
    return `<span class="${bad ? 'up' : 'down'}">${pct > 0 ? '▲' : '▼'} %${fmt(Math.abs(pct), 1)}</span>`;
  }

  function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // Gömülü çerçevelerde (ör. önizleme ortamları) dosya indirme engellenebilir.
  const framed = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  function modal(build) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true"></div>';
      const box = wrap.firstChild;
      const close = (v) => {
        wrap.remove();
        document.removeEventListener('keydown', onKey);
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') close(false);
      };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) close(false);
      });
      build(box, close);
      document.body.appendChild(wrap);
      const focus = box.querySelector('[data-focus]') || box.querySelector('button');
      if (focus) focus.focus();
    });
  }

  /** Sayfa içi onay penceresi (tarayıcının confirm() penceresi yerine). */
  function ask(message, okLabel) {
    return modal((box, close) => {
      box.innerHTML = `<p>${esc(message)}</p><div class="actions end"><button class="btn secondary" data-no>Vazgeç</button><button class="btn" data-focus data-yes>${esc(okLabel || 'Devam et')}</button></div>`;
      box.querySelector('[data-no]').addEventListener('click', () => close(false));
      box.querySelector('[data-yes]').addEventListener('click', () => close(true));
    });
  }

  /** İndirme yapılamayan ortamlarda içeriği kopyalanabilir biçimde gösterir. */
  function showText(name, content) {
    return modal((box, close) => {
      box.innerHTML = `<h3>${esc(name)}</h3><p class="muted">Bu ortamda dosya indirilemiyor. İçeriği kopyalayıp bir metin dosyasına <strong>${esc(name)}</strong> adıyla kaydedebilirsiniz.</p>
        <textarea readonly rows="12" class="mono"></textarea>
        <div class="actions end"><button class="btn secondary" data-close>Kapat</button><button class="btn" data-copy data-focus>Kopyala</button></div>`;
      const ta = box.querySelector('textarea');
      ta.value = content.replace(/^\uFEFF/, '');
      box.querySelector('[data-close]').addEventListener('click', () => close(true));
      box.querySelector('[data-copy]').addEventListener('click', () => {
        const done = () => toast('Panoya kopyalandı.');
        const fallback = () => {
          ta.focus();
          ta.select();
          toast('Metin seçildi; Ctrl+C ile kopyalayın.');
        };
        try {
          navigator.clipboard.writeText(ta.value).then(done, fallback);
        } catch (e) {
          fallback();
        }
      });
    });
  }

  function download(name, content, mime) {
    if (framed) return showText(name, content);
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function readFile(input) {
    return new Promise((resolve, reject) => {
      const file = input.files && input.files[0];
      if (!file) return reject(new Error('Dosya seçilmedi.'));
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file, 'utf-8');
    });
  }

  function slug(s) {
    return String(s || 'tesis')
      .toLowerCase()
      .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function persist(msg) {
    if (!Storage.save(state)) toast('Uyarı: veriler tarayıcıya kaydedilemedi.');
    else if (msg) toast(msg);
    refreshSelectors();
    render();
  }

  /** Yalnızca iki yılda da verisi olan aylarla karşılaştırma. */
  function sameMonthsChange(cur, prev) {
    let a = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < 12; i++) {
      if (cur.months[i].hasData && prev.months[i].hasData) {
        a += cur.months[i].total;
        b += prev.months[i].total;
        n++;
      }
    }
    return { a, b, n, pct: b ? ((a - b) / b) * 100 : null };
  }

  function facilityName(id) {
    const f = Calc.facilityInfo(state, id);
    return f ? f.name : '';
  }

  // ---------------------------------------------------------------- grafikler

  const PALETTE = ['#2f6b4f', '#4c7196', '#c7962c', '#b85a3e', '#7a6a9a', '#4f9a8a', '#a0785a', '#8a958f', '#9c5f74', '#6f8f3e', '#b07a2a'];
  const SCOPE_COLORS = { 1: '#b85a3e', 2: '#c7962c', 3: '#4c7196' };

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function makeChart(id, config) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
    const el = document.getElementById(id);
    if (!el) return;
    if (!window.Chart) {
      el.parentElement.innerHTML =
        '<div class="chart-fallback">Grafik kütüphanesi yüklenemedi (internet bağlantısı gerekli). Veriler tablolarda görüntülenmeye devam eder.</div>';
      return;
    }
    window.Chart.defaults.color = cssVar('--muted');
    window.Chart.defaults.borderColor = cssVar('--border');
    window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false }, config.options || {});
    charts[id] = new window.Chart(el, config);
  }

  const tonTicks = { callback: (v) => fmt(v, 0) };
  const tonTooltip = {
    callbacks: { label: (c) => `${c.dataset.label || c.label}: ${fmt(c.parsed.y ?? c.parsed, 2)} tCO₂e` },
  };

  // ---------------------------------------------------------------- seçiciler

  function refreshSelectors() {
    const fs = $('#facilitySelect');
    const ids = state.facilities.map((f) => f.id);
    if (ui.facility !== ALL && !ids.includes(ui.facility)) ui.facility = ids.length > 1 ? ALL : ids[0] || null;
    if (ui.facility === ALL && ids.length < 2) ui.facility = ids[0] || null;

    let opts = '';
    if (!ids.length) opts = '<option value="">— Tesis yok —</option>';
    if (ids.length > 1) opts += `<option value="${ALL}">Tüm tesisler (toplam)</option>`;
    opts += state.facilities.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');
    fs.innerHTML = opts;
    fs.value = ui.facility || '';

    const years = new Set([now.getFullYear(), ui.year]);
    for (const y of Calc.yearsWithData(state, ALL)) years.add(y);
    const ys = $('#yearSelect');
    ys.innerHTML = [...years]
      .sort((a, b) => b - a)
      .map((y) => `<option value="${y}">${y}</option>`)
      .join('');
    ys.value = String(ui.year);
  }

  // ---------------------------------------------------------------- render

  const renderers = {};

  function render() {
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + ui.view));
    const fn = renderers[ui.view];
    if (fn) fn($('#view-' + ui.view));
  }

  function emptyFacilities() {
    return `
      <div class="card empty">
                <h3>Henüz tesis eklenmemiş</h3>
        <p>Karbon ayak izini hesaplamak için önce şirket, fabrika veya ofisinizi tesis olarak ekleyin.<br/>
        Uygulamayı denemek için örnek veriyi de yükleyebilirsiniz.</p>
        <div class="actions" style="justify-content:center">
          <button class="btn" data-go="facilities">+ Tesis ekle</button>
          <button class="btn secondary" data-demo>Örnek veriyi yükle</button>
        </div>
      </div>`;
  }

  function bindCommon(root) {
    $$('[data-go]', root).forEach((b) => b.addEventListener('click', () => {
      ui.view = b.dataset.go;
      render();
    }));
    $$('[data-demo]', root).forEach((b) => b.addEventListener('click', loadDemo));
  }

  async function loadDemo() {
    const hasData = state.facilities.length > 0;
    if (hasData && !(await ask('Örnek veri yüklenirse mevcut tüm verileriniz silinecek. Devam edilsin mi?', 'Örnek veriyi yükle'))) return;
    state = Storage.demoState(now);
    ui.facility = ALL;
    ui.year = now.getFullYear();
    ui.cmp = {};
    persist('Örnek veri yüklendi.');
  }

  // ---------------------------------------------------------------- Panel

  renderers.dashboard = (root) => {
    if (!state.facilities.length) {
      root.innerHTML = emptyFacilities();
      return bindCommon(root);
    }
    const fid = ui.facility;
    const year = ui.year;
    const cur = Calc.aggregateYear(state, fid, year);
    const prev = Calc.aggregateYear(state, fid, year - 1);
    const tot = cur.total;
    const yoy = sameMonthsChange(cur, prev);
    const intens = Calc.intensities(state, fid, cur);
    const target = Calc.targetProgress(state, fid, year);
    const scopeShare = (s) => (tot.total ? `%${fmt((tot.scopes[s] / tot.total) * 100, 1)}` : '—');

    let targetKpi = '';
    if (target && !target.incompleteBase && target.current !== null) {
      const ratio = Math.max(0, Math.min(1, (target.achievedPct || 0) / target.pct));
      targetKpi = `
        <div class="kpi">
          <div class="label">Hedef: ${target.targetYear}'e kadar %${fmt(target.pct)} azaltım</div>
          <div class="value">%${fmt(target.achievedPct, 1)} <small>gerçekleşen</small></div>
          <div class="progress ${target.onTrack ? '' : 'bad'}"><div style="width:${ratio * 100}%"></div></div>
          <div class="sub">${target.onTrack ? '<span class="pill ok">Yolunda</span>' : '<span class="pill bad">Hedefin gerisinde</span>'} · baz ${target.baseYear}</div>
        </div>`;
    } else if (target && target.incompleteBase) {
      targetKpi = `<div class="kpi"><div class="label">Azaltım hedefi</div><div class="value"><small>Baz yılı (${target.baseYear}) verisi eksik</small></div><div class="sub">${target.baseMonths}/12 ay girildi</div></div>`;
    }

    root.innerHTML = `
      <div class="view-header">
        <div>
          <h2>${esc(facilityName(fid))} · ${year}</h2>
          <p>${tot.monthsWithData} / 12 ay veri girildi${tot.monthsWithData && tot.monthsWithData < 12 ? ' · yıl henüz tamamlanmadı' : ''}</p>
        </div>
        <div class="actions no-print">
          <button class="btn secondary" data-go="entry">+ Veri gir</button>
          <button class="btn secondary" data-go="recommendations">Öneriler</button>
        </div>
      </div>

      ${tot.monthsWithData ? '' : `<div class="notice warn">${year} yılı için henüz veri yok. "Veri Girişi" sekmesinden aylık tüketimlerinizi girin.</div>`}

      <div class="kpis">
        <div class="kpi">
          <div class="label">Toplam emisyon (${year})</div>
          <div class="value">${t(tot.total)} <small>tCO₂e</small></div>
          <div class="sub">Geçen yılın aynı ayları: ${yoy.n ? pctHtml(yoy.pct) : '—'}</div>
        </div>
        <div class="kpi s1"><div class="label">Kapsam 1 · doğrudan</div><div class="value">${t(tot.scopes[1])} <small>t</small></div><div class="sub">Toplamın ${scopeShare(1)}'i</div></div>
        <div class="kpi s2"><div class="label">Kapsam 2 · enerji dolaylı</div><div class="value">${t(tot.scopes[2])} <small>t</small></div><div class="sub">Toplamın ${scopeShare(2)}'i</div></div>
        <div class="kpi s3"><div class="label">Kapsam 3 · diğer dolaylı</div><div class="value">${t(tot.scopes[3])} <small>t</small></div><div class="sub">Toplamın ${scopeShare(3)}'i</div></div>
        <div class="kpi">
          <div class="label">Yoğunluk göstergeleri</div>
          <div class="value">${intens.perEmployee !== null ? t(intens.perEmployee) : '—'} <small>t / çalışan·yıl</small></div>
          <div class="sub">
            ${intens.perProduction !== null ? `${fmt(intens.perProduction, 1)} kg / ${esc(intens.productionUnit || 'üretim birimi')}` : ''}
            ${intens.perArea !== null ? ` · ${fmt(intens.perArea, 1)} kg / m²·yıl` : ''}
            ${intens.annualized ? '<br/>(eksik aylar yıllığa ölçeklendi)' : ''}
          </div>
        </div>
        ${targetKpi}
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3>Aylık emisyonlar (tCO₂e) — kapsamlara göre</h3>
          <div class="chart-box"><canvas id="chMonthly"></canvas></div>
        </div>
        <div class="card">
          <h3>Kaynaklara göre dağılım</h3>
          <div class="chart-box"><canvas id="chSources"></canvas></div>
        </div>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <h3>Aylık döküm</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ay</th><th class="num">Kapsam 1</th><th class="num">Kapsam 2</th><th class="num">Kapsam 3</th><th class="num">Toplam (t)</th><th class="num">${year - 1} (t)</th><th class="num">Değişim</th><th class="num">Önceki aya göre</th></tr></thead>
            <tbody>
              ${cur.months
                .map((m, i) => {
                  const p = prev.months[i];
                  const before = i > 0 ? cur.months[i - 1] : prev.months[11];
                  if (!m.hasData) return `<tr class="muted"><td>${MONTHS[i]}</td><td colspan="4">veri yok</td><td class="num">${p.hasData ? t(p.total) : '—'}</td><td></td><td></td></tr>`;
                  return `<tr>
                    <td>${MONTHS[i]}</td>
                    <td class="num">${t(m.scopes[1])}</td>
                    <td class="num">${t(m.scopes[2])}</td>
                    <td class="num">${t(m.scopes[3])}</td>
                    <td class="num"><strong>${t(m.total)}</strong></td>
                    <td class="num">${p.hasData ? t(p.total) : '—'}</td>
                    <td class="num">${p.hasData ? pctHtml(((m.total - p.total) / (p.total || 1)) * 100) : '—'}</td>
                    <td class="num">${before.hasData ? pctHtml(((m.total - before.total) / (before.total || 1)) * 100) : '—'}</td>
                  </tr>`;
                })
                .join('')}
              <tr class="total"><td>Yıl toplamı</td><td class="num">${t(tot.scopes[1])}</td><td class="num">${t(tot.scopes[2])}</td><td class="num">${t(tot.scopes[3])}</td><td class="num">${t(tot.total)}</td><td class="num">${prev.total.monthsWithData ? t(prev.total.total) : '—'}</td><td class="num">${yoy.n ? pctHtml(yoy.pct) : '—'}</td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
    bindCommon(root);

    makeChart('chMonthly', {
      type: 'bar',
      data: {
        labels: MONTHS_SHORT,
        datasets: [
          ...[1, 2, 3].map((s) => ({
            label: SCOPES[s].name,
            data: cur.months.map((m) => (m.hasData ? m.scopes[s] / 1000 : null)),
            backgroundColor: SCOPE_COLORS[s],
            stack: 'cur',
          })),
          {
            type: 'line',
            label: `${year - 1} toplam`,
            data: prev.months.map((m) => (m.hasData ? m.total / 1000 : null)),
            borderColor: cssVar('--muted'),
            borderDash: [5, 4],
            pointRadius: 2,
            tension: 0.25,
          },
        ],
      },
      options: {
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: tonTicks } },
        plugins: { tooltip: tonTooltip, legend: { position: 'bottom' } },
      },
    });

    const top = Calc.topSources(tot);
    const main = top.slice(0, 8);
    const rest = top.slice(8).reduce((s, x) => s + x.kg, 0);
    makeChart('chSources', {
      type: 'doughnut',
      data: {
        labels: [...main.map((x) => x.source.label), ...(rest ? ['Diğer'] : [])],
        datasets: [{ data: [...main.map((x) => x.kg / 1000), ...(rest ? [rest / 1000] : [])], backgroundColor: PALETTE, borderWidth: 1 }],
      },
      options: {
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (c) => `${c.label}: ${fmt(c.parsed, 2)} t (%${fmt(tot.total ? ((c.parsed * 1000) / tot.total) * 100 : 0, 1)})`,
            },
          },
        },
      },
    });
  };

  // ---------------------------------------------------------------- Veri Girişi

  function defaultEntryMonth() {
    if (ui.entryMonth && Number(ui.entryMonth.slice(0, 4)) === ui.year) return ui.entryMonth;
    const recs = state.records[ui.facility] || {};
    const lastMonth = ui.year < now.getFullYear() ? 12 : Math.max(1, now.getMonth());
    for (let m = 1; m <= lastMonth; m++) {
      const k = Calc.monthKey(ui.year, m);
      if (!recs[k]) return k;
    }
    return Calc.monthKey(ui.year, lastMonth);
  }

  renderers.entry = (root) => {
    if (!state.facilities.length) {
      root.innerHTML = emptyFacilities();
      return bindCommon(root);
    }
    if (ui.facility === ALL) {
      root.innerHTML = `
        <div class="card">
          <h3>Veri girişi için bir tesis seçin</h3>
          <p>Veriler tesis bazında girilir. Hangi tesis için veri gireceksiniz?</p>
          <div class="actions">${state.facilities.map((f) => `<button class="btn secondary" data-pick="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</div>
        </div>`;
      $$('[data-pick]', root).forEach((b) => b.addEventListener('click', () => {
        ui.facility = b.dataset.pick;
        refreshSelectors();
        render();
      }));
      return;
    }

    const fid = ui.facility;
    const f = Calc.facilityInfo(state, fid);
    const monthK = defaultEntryMonth();
    ui.entryMonth = monthK;
    const recs = state.records[fid] || (state.records[fid] = {});
    const rec = recs[monthK];
    const yearAgg = Calc.aggregateYear(state, fid, ui.year);

    const scopeFieldset = (scope) => {
      let lastGroup = '';
      const fields = SOURCES.filter((s) => s.scope === scope)
        .map((s) => {
          const groupHtml = s.group !== lastGroup ? `<div class="group-title">${esc(s.group)}</div>` : '';
          lastGroup = s.group;
          const v = rec && rec.activity && rec.activity[s.key] ? rec.activity[s.key] : '';
          return `${groupHtml}
            <label class="field">${esc(s.label)}
              <span class="input-unit"><input type="number" min="0" step="any" inputmode="decimal" name="${s.key}" value="${esc(v)}" placeholder="0" /><span>${esc(s.unit)}</span></span>
            </label>`;
        })
        .join('');
      return `<fieldset><legend>${SCOPES[scope].name} <span class="tag s${scope}">${esc(SCOPES[scope].desc)}</span></legend><div class="form-grid">${fields}</div></fieldset>`;
    };

    root.innerHTML = `
      <div class="view-header">
        <div>
          <h2>Veri Girişi · ${esc(f.name)}</h2>
          <p>Aylık tüketim/faaliyet verilerini fatura ve sayaç kayıtlarından girin. Boş bırakılan alanlar 0 kabul edilir.</p>
        </div>
      </div>

      <form id="entryForm" class="card" autocomplete="off">
        <div class="form-grid" style="margin-bottom:1rem">
          <label class="field">Dönem (ay)
            <input type="month" name="__month" value="${monthK}" required />
          </label>
          <label class="field">Üretim miktarı ${f.productionUnit ? `(${esc(f.productionUnit)})` : ''}
            <input type="number" min="0" step="any" name="__production" value="${esc(rec && rec.production ? rec.production : '')}" placeholder="${f.productionUnit ? '0' : 'İsteğe bağlı'}" />
          </label>
          <label class="field">Not
            <input type="text" name="__note" maxlength="200" value="${esc(rec ? rec.note : '')}" placeholder="ör. bakım duruşu, yeni hat devreye alındı" />
          </label>
        </div>
        ${rec ? `<div class="notice">Bu ay için kayıt mevcut — değişiklikler mevcut kaydın üzerine yazılır.</div>` : ''}
        ${scopeFieldset(1)}
        ${scopeFieldset(2)}
        ${scopeFieldset(3)}
        <div class="preview">
          <div class="totals" id="entryPreview"></div>
          <div class="actions">
            <button type="button" class="btn secondary" id="copyPrev">Önceki aydan kopyala</button>
            <button type="button" class="btn secondary" id="clearForm">Temizle</button>
            ${rec ? '<button type="button" class="btn danger" id="deleteRec">Kaydı sil</button>' : ''}
            <button type="submit" class="btn">Kaydet</button>
          </div>
        </div>
      </form>

      <div class="card">
        <div class="view-header" style="margin-bottom:0.75rem">
          <h3 style="margin:0">${ui.year} yılı kayıtları</h3>
          <div class="actions">
            <button class="btn secondary sm" id="csvTemplate">CSV şablonu indir</button>
            <button class="btn secondary sm" id="csvExport">CSV olarak dışa aktar</button>
            <label class="btn secondary sm">CSV içe aktar<input type="file" id="csvImport" accept=".csv,text/csv" hidden /></label>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ay</th><th>Durum</th><th class="num">Kapsam 1</th><th class="num">Kapsam 2</th><th class="num">Kapsam 3</th><th class="num">Toplam (t)</th><th>Not</th><th></th></tr></thead>
            <tbody>
              ${yearAgg.months
                .map((m, i) => {
                  const k = Calc.monthKey(ui.year, i + 1);
                  const r = recs[k];
                  return `<tr class="${m.hasData ? '' : 'muted'}">
                    <td>${MONTHS[i]}</td>
                    <td>${m.hasData ? '<span class="pill ok">Girildi</span>' : '<span class="pill">Eksik</span>'}</td>
                    <td class="num">${m.hasData ? t(m.scopes[1]) : ''}</td>
                    <td class="num">${m.hasData ? t(m.scopes[2]) : ''}</td>
                    <td class="num">${m.hasData ? t(m.scopes[3]) : ''}</td>
                    <td class="num">${m.hasData ? `<strong>${t(m.total)}</strong>` : ''}</td>
                    <td>${esc(r ? r.note : '')}</td>
                    <td><button class="btn secondary sm" data-edit="${k}">${m.hasData ? 'Düzenle' : 'Gir'}</button></td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    const form = $('#entryForm', root);

    const readForm = () => {
      const activity = {};
      for (const s of SOURCES) {
        const v = Calc.num(form.elements[s.key].value);
        if (v < 0) throw new Error(`${s.label} negatif olamaz.`);
        if (v) activity[s.key] = v;
      }
      return { activity, production: Calc.num(form.elements.__production.value), note: form.elements.__note.value.trim() };
    };

    const updatePreview = () => {
      let r;
      try {
        r = Calc.recordEmissions(readForm().activity, state.factorOverrides);
      } catch (e) {
        $('#entryPreview', root).innerHTML = `<span class="up">${esc(e.message)}</span>`;
        return;
      }
      $('#entryPreview', root).innerHTML = `
        <span>Bu ay toplam: <strong>${t(r.total)} tCO₂e</strong></span>
        <span><span class="tag s1">K1</span> ${t(r.scopes[1])}</span>
        <span><span class="tag s2">K2</span> ${t(r.scopes[2])}</span>
        <span><span class="tag s3">K3</span> ${t(r.scopes[3])}</span>`;
    };
    updatePreview();
    form.addEventListener('input', updatePreview);

    form.elements.__month.addEventListener('change', (e) => {
      const v = e.target.value;
      if (!/^\d{4}-\d{2}$/.test(v)) return;
      ui.entryMonth = v;
      const y = Number(v.slice(0, 4));
      if (y !== ui.year) {
        ui.year = y;
        refreshSelectors();
      }
      render();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const k = form.elements.__month.value;
      if (!/^\d{4}-\d{2}$/.test(k)) return toast('Lütfen geçerli bir ay seçin.');
      let data;
      try {
        data = readForm();
      } catch (err) {
        return toast(err.message);
      }
      if (!Object.keys(data.activity).length && !(await ask('Tüm alanlar boş. Bu ay için sıfır emisyonlu bir kayıt oluşturulsun mu?'))) return;
      recs[k] = data;
      // Kaydettikten sonra bir sonraki eksik aya geç.
      const next = Number(k.slice(5)) + 1;
      ui.entryMonth = next <= 12 && !recs[Calc.monthKey(ui.year, next)] ? Calc.monthKey(ui.year, next) : k;
      persist(`${monthLabel(k)} kaydedildi.`);
    });

    $('#copyPrev', root).addEventListener('click', () => {
      const [y, m] = form.elements.__month.value.split('-').map(Number);
      const pk = m === 1 ? Calc.monthKey(y - 1, 12) : Calc.monthKey(y, m - 1);
      const p = recs[pk];
      if (!p) return toast(`${monthLabel(pk)} için kayıt bulunamadı.`);
      for (const s of SOURCES) form.elements[s.key].value = p.activity && p.activity[s.key] ? p.activity[s.key] : '';
      form.elements.__production.value = p.production || '';
      updatePreview();
      toast(`${monthLabel(pk)} verileri kopyalandı — kaydetmeyi unutmayın.`);
    });

    $('#clearForm', root).addEventListener('click', () => {
      for (const s of SOURCES) form.elements[s.key].value = '';
      form.elements.__production.value = '';
      form.elements.__note.value = '';
      updatePreview();
    });

    const del = $('#deleteRec', root);
    if (del) del.addEventListener('click', async () => {
      if (!(await ask(`${monthLabel(monthK)} kaydı silinsin mi?`, 'Kaydı sil'))) return;
      delete recs[monthK];
      persist('Kayıt silindi.');
    });

    $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => {
      ui.entryMonth = b.dataset.edit;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));

    $('#csvTemplate', root).addEventListener('click', () => {
      const header = ['ay', ...SOURCES.map((s) => s.key), 'uretim', 'not'].join(';');
      const units = ['# birim', ...SOURCES.map((s) => s.unit), f.productionUnit || '', ''].join(';');
      download('karbon-veri-sablonu.csv', '﻿' + header + '\n' + `${ui.year}-01` + ';'.repeat(SOURCES.length + 2) + '\n' + units.replace(/^# birim/, '# birimler (bu satırı silin)') + '\n', 'text/csv;charset=utf-8');
    });
    $('#csvExport', root).addEventListener('click', () => {
      download(`karbon-veri-${slug(f.name)}.csv`, '﻿' + Storage.recordsToCsv(state, fid), 'text/csv;charset=utf-8');
    });
    $('#csvImport', root).addEventListener('change', async (e) => {
      try {
        const imported = Storage.csvToRecords(await readFile(e.target));
        const n = Object.keys(imported).length;
        if (!n) return toast('CSV dosyasında geçerli satır bulunamadı.');
        const overlap = Object.keys(imported).filter((k) => recs[k]).length;
        if (overlap && !(await ask(`${n} aylık kayıt içe aktarılacak; ${overlap} ay için mevcut kayıtların üzerine yazılacak. Devam edilsin mi?`))) return;
        Object.assign(recs, imported);
        persist(`${n} aylık kayıt içe aktarıldı.`);
      } catch (err) {
        toast('CSV okunamadı: ' + err.message);
      } finally {
        e.target.value = '';
      }
    });
  };

  // ---------------------------------------------------------------- Karşılaştırma

  function sourceDiffTable(a, b, labelA, labelB) {
    const rows = Calc.compareBySource(a, b);
    if (!rows.length) return '<p class="muted">Karşılaştırılacak veri yok.</p>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Kaynak</th><th>Kapsam</th><th class="num">${esc(labelA)} (t)</th><th class="num">${esc(labelB)} (t)</th><th class="num">Fark (t)</th><th class="num">Değişim</th></tr></thead>
      <tbody>
        ${[1, 2, 3]
          .map((s) => {
            const c = Calc.change(a.scopes[s], b.scopes[s]);
            return `<tr class="total"><td>${SCOPES[s].name}</td><td><span class="tag s${s}">K${s}</span></td><td class="num">${t(c.current)}</td><td class="num">${t(c.previous)}</td><td class="num">${c.diff > 0 ? '+' : ''}${t(c.diff)}</td><td class="num">${pctHtml(c.pct)}</td></tr>`;
          })
          .join('')}
        ${rows
          .map(
            (r) => `<tr><td>${esc(r.source.label)}</td><td><span class="tag s${r.source.scope}">K${r.source.scope}</span></td><td class="num">${t(r.current)}</td><td class="num">${t(r.previous)}</td><td class="num">${r.diff > 0 ? '+' : ''}${t(r.diff)}</td><td class="num">${pctHtml(r.pct)}</td></tr>`
          )
          .join('')}
        <tr class="total"><td colspan="2">Genel toplam</td><td class="num">${t(a.total)}</td><td class="num">${t(b.total)}</td><td class="num">${a.total - b.total > 0 ? '+' : ''}${t(a.total - b.total)}</td><td class="num">${pctHtml(b.total ? ((a.total - b.total) / b.total) * 100 : null)}</td></tr>
      </tbody></table></div>`;
  }

  renderers.compare = (root) => {
    if (!state.facilities.length) {
      root.innerHTML = emptyFacilities();
      return bindCommon(root);
    }
    const fid = ui.facility;
    const years = Calc.yearsWithData(state, fid);
    const c = ui.cmp;
    if (!c.yearA) c.yearA = ui.year;
    if (!c.yearB) c.yearB = c.yearA - 1;
    if (!c.monthA) {
      // Seçili yılda verisi olan son ay
      const agg = Calc.aggregateYear(state, fid, ui.year);
      const last = [...agg.months].reverse().find((m) => m.hasData);
      c.monthA = Calc.monthKey(ui.year, last ? last.month : Math.max(1, now.getMonth()));
    }
    if (!c.monthB) {
      const [y, m] = c.monthA.split('-').map(Number);
      c.monthB = Calc.monthKey(y - 1, m);
    }

    const yearOpts = (sel) => {
      const set = new Set([...years, ui.year, ui.year - 1, Number(sel)]);
      return [...set].sort((a, b) => b - a).map((y) => `<option value="${y}" ${Number(sel) === y ? 'selected' : ''}>${y}</option>`).join('');
    };

    const A = Calc.aggregateYear(state, fid, Number(c.yearA));
    const B = Calc.aggregateYear(state, fid, Number(c.yearB));
    const same = sameMonthsChange(A, B);

    const [ay, am] = c.monthA.split('-').map(Number);
    const [by, bm] = c.monthB.split('-').map(Number);
    const MA = Calc.aggregateMonth(state, fid, ay, am);
    const MB = Calc.aggregateMonth(state, fid, by, bm);

    const multi = state.facilities.length > 1;

    root.innerHTML = `
      <div class="view-header">
        <div><h2>Karşılaştırma · ${esc(facilityName(fid))}</h2><p>Yıllar, aylar ve tesisler arasında emisyonları karşılaştırın.</p></div>
      </div>

      <div class="card">
        <h3>Yıllık karşılaştırma</h3>
        <div class="actions" style="margin-bottom:1rem">
          <label class="field" style="width:140px">Yıl A<select id="cmpYearA">${yearOpts(c.yearA)}</select></label>
          <label class="field" style="width:140px">Yıl B<select id="cmpYearB">${yearOpts(c.yearB)}</select></label>
        </div>
        <div class="kpis">
          <div class="kpi"><div class="label">${c.yearA} toplam (${A.total.monthsWithData} ay)</div><div class="value">${t(A.total.total)} <small>t</small></div></div>
          <div class="kpi"><div class="label">${c.yearB} toplam (${B.total.monthsWithData} ay)</div><div class="value">${t(B.total.total)} <small>t</small></div></div>
          <div class="kpi"><div class="label">Aynı aylar bazında değişim (${same.n} ay)</div><div class="value">${same.n ? pctHtml(same.pct) : '—'}</div><div class="sub">${same.n ? `${t(same.a)} t ↔ ${t(same.b)} t` : 'Ortak ay yok'}</div></div>
        </div>
        <div class="chart-box"><canvas id="chYears"></canvas></div>
        <h3 style="margin-top:1.25rem">Kaynak bazında fark (${c.yearA} − ${c.yearB})</h3>
        ${A.total.monthsWithData !== B.total.monthsWithData ? `<div class="notice warn">Yıllarda girilen ay sayısı farklı (${A.total.monthsWithData} / ${B.total.monthsWithData}); toplamlar doğrudan karşılaştırılabilir değildir.</div>` : ''}
        ${sourceDiffTable(A.total, B.total, String(c.yearA), String(c.yearB))}
      </div>

      <div class="card">
        <h3>Aylık karşılaştırma</h3>
        <div class="actions" style="margin-bottom:1rem; align-items:flex-end">
          <label class="field" style="width:180px">Ay A<input type="month" id="cmpMonthA" value="${c.monthA}" /></label>
          <label class="field" style="width:180px">Ay B<input type="month" id="cmpMonthB" value="${c.monthB}" /></label>
          <button class="btn secondary sm" id="cmpPrevMonth">Bir önceki ay</button>
          <button class="btn secondary sm" id="cmpPrevYear">Geçen yılın aynı ayı</button>
        </div>
        ${!MA.hasData || !MB.hasData ? `<div class="notice warn">${!MA.hasData ? monthLabel(c.monthA) : monthLabel(c.monthB)} için veri yok.</div>` : ''}
        ${sourceDiffTable(MA, MB, monthLabel(c.monthA), monthLabel(c.monthB))}
      </div>

      ${multi ? `
      <div class="card">
        <h3>Tesis karşılaştırması · ${ui.year}</h3>
        <div class="chart-box small"><canvas id="chFacilities"></canvas></div>
        <div class="table-wrap" style="margin-top:1rem"><table>
          <thead><tr><th>Tesis</th><th>Tür</th><th class="num">Ay</th><th class="num">Kapsam 1</th><th class="num">Kapsam 2</th><th class="num">Kapsam 3</th><th class="num">Toplam (t)</th><th class="num">t / çalışan·yıl</th><th class="num">kg / m²·yıl</th><th class="num">Geçen yıla göre</th></tr></thead>
          <tbody>
          ${state.facilities
            .map((f) => {
              const a = Calc.aggregateYear(state, f.id, ui.year);
              const p = Calc.aggregateYear(state, f.id, ui.year - 1);
              const i = Calc.intensities(state, f.id, a);
              const ch = sameMonthsChange(a, p);
              return `<tr><td>${esc(f.name)}</td><td>${esc(f.type || '')}</td><td class="num">${a.total.monthsWithData}</td><td class="num">${t(a.total.scopes[1])}</td><td class="num">${t(a.total.scopes[2])}</td><td class="num">${t(a.total.scopes[3])}</td><td class="num"><strong>${t(a.total.total)}</strong></td><td class="num">${i.perEmployee !== null ? t(i.perEmployee) : '—'}</td><td class="num">${i.perArea !== null ? fmt(i.perArea, 1) : '—'}</td><td class="num">${ch.n ? pctHtml(ch.pct) : '—'}</td></tr>`;
            })
            .join('')}
          </tbody></table></div>
      </div>` : ''}`;

    $('#cmpYearA', root).addEventListener('change', (e) => { c.yearA = Number(e.target.value); render(); });
    $('#cmpYearB', root).addEventListener('change', (e) => { c.yearB = Number(e.target.value); render(); });
    $('#cmpMonthA', root).addEventListener('change', (e) => { if (e.target.value) { c.monthA = e.target.value; render(); } });
    $('#cmpMonthB', root).addEventListener('change', (e) => { if (e.target.value) { c.monthB = e.target.value; render(); } });
    $('#cmpPrevMonth', root).addEventListener('click', () => { c.monthB = am === 1 ? Calc.monthKey(ay - 1, 12) : Calc.monthKey(ay, am - 1); render(); });
    $('#cmpPrevYear', root).addEventListener('click', () => { c.monthB = Calc.monthKey(ay - 1, am); render(); });

    makeChart('chYears', {
      type: 'bar',
      data: {
        labels: MONTHS_SHORT,
        datasets: [
          { label: String(c.yearA), data: A.months.map((m) => (m.hasData ? m.total / 1000 : null)), backgroundColor: PALETTE[0] },
          { label: String(c.yearB), data: B.months.map((m) => (m.hasData ? m.total / 1000 : null)), backgroundColor: PALETTE[7] },
        ],
      },
      options: { scales: { y: { beginAtZero: true, ticks: tonTicks } }, plugins: { tooltip: tonTooltip, legend: { position: 'bottom' } } },
    });

    if (multi) {
      const aggs = state.facilities.map((f) => Calc.aggregateYear(state, f.id, ui.year).total);
      makeChart('chFacilities', {
        type: 'bar',
        data: {
          labels: state.facilities.map((f) => f.name),
          datasets: [1, 2, 3].map((s) => ({ label: SCOPES[s].name, data: aggs.map((a) => a.scopes[s] / 1000), backgroundColor: SCOPE_COLORS[s] })),
        },
        options: {
          indexAxis: 'y',
          scales: { x: { stacked: true, beginAtZero: true, ticks: tonTicks }, y: { stacked: true } },
          plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.x, 2)} tCO₂e` } }, legend: { position: 'bottom' } },
        },
      });
    }
  };

  // ---------------------------------------------------------------- Öneriler

  function recCard(r) {
    return `<article class="rec ${r.type}">
      <header>
        <h4>${esc(r.title)}</h4>
        <div class="actions">
          <span class="tag">${esc(r.category)}</span>
          <span class="tag ${r.priority}">Öncelik: ${r.priority}</span>
          ${r.potential ? `<span class="saving">≈ −${t(r.potential)} tCO₂e/yıl</span>` : ''}
        </div>
      </header>
      <p>${esc(r.text)}</p>
      ${r.detail ? `<p class="detail">${esc(r.detail)}</p>` : ''}
    </article>`;
  }

  renderers.recommendations = (root) => {
    if (!state.facilities.length) {
      root.innerHTML = emptyFacilities();
      return bindCommon(root);
    }
    const fid = ui.facility;
    const recs = Recommendations.generate(state, fid, ui.year);
    const agg = Calc.aggregateYear(state, fid, ui.year);
    const actions = recs.filter((r) => r.type === 'action');
    const notes = recs.filter((r) => r.type !== 'action');
    const potential = actions.reduce((s, r) => s + r.potential, 0);
    const total = agg.total.total;
    // Elektrik için iki öneri aynı kaynağı hedefliyor; senaryoda toplam elektrik emisyonunu aşmasın.
    const elecKg = agg.total.bySource.electricity || 0;
    const elecPot = actions.filter((r) => r.id === 'efficiency' || r.id === 'renewable').reduce((s, r) => s + r.potential, 0);
    const scenario = Math.min(total, potential - Math.max(0, elecPot - elecKg));

    root.innerHTML = `
      <div class="view-header">
        <div><h2>Azaltım Önerileri · ${esc(facilityName(fid))} · ${ui.year}</h2>
        <p>Öneriler, emisyon dağılımınıza, geçen yıla göre değişime ve hedeflerinize göre otomatik üretilir.</p></div>
      </div>

      ${actions.length ? `
      <div class="kpis">
        <div class="kpi"><div class="label">Mevcut emisyon (${agg.total.monthsWithData} ay)</div><div class="value">${t(total)} <small>tCO₂e</small></div></div>
        <div class="kpi"><div class="label">Toplam azaltım potansiyeli</div><div class="value">${t(scenario)} <small>t</small></div><div class="sub">Mevcut emisyonun %${fmt(total ? (scenario / total) * 100 : 0, 1)}'i</div></div>
        <div class="kpi"><div class="label">Tüm öneriler uygulanırsa</div><div class="value">${t(total - scenario)} <small>t</small></div><div class="sub">Tahmini, kaba bir senaryodur</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Eylem önerileri (potansiyele göre)</h3>
          ${actions.map(recCard).join('')}
        </div>
        <div class="stack">
          <div class="card">
            <h3>Azaltım potansiyeli (tCO₂e/yıl)</h3>
            <div class="chart-box"><canvas id="chPotential"></canvas></div>
          </div>
          <div class="card">
            <h3>Uyarılar ve bilgilendirmeler</h3>
            ${notes.length ? notes.map(recCard).join('') : '<p class="muted">Uyarı yok.</p>'}
          </div>
        </div>
      </div>` : `<div class="card">${recs.map(recCard).join('')}</div>`}

      <div class="card">
        <h3>Genel yol haritası</h3>
        <ol>
          <li><strong>Ölç:</strong> Tüm tesislerin 12 aylık verisini eksiksiz girin; faturaları ve sayaç okumalarını kaynak belge olarak saklayın.</li>
          <li><strong>Hedef koy:</strong> Baz yılı belirleyip bilim temelli (SBTi uyumlu, yıllık ≈%4,2) bir azaltım hedefi tanımlayın ("Tesisler" sayfası).</li>
          <li><strong>Hızlı kazanımlar:</strong> Aydınlatma, basınçlı hava kaçakları, kazan ayarı, soğutucu gaz kaçakları gibi düşük maliyetli önlemlerle başlayın.</li>
          <li><strong>Yatırımlar:</strong> GES, ısı pompası, atık ısı geri kazanımı ve filo elektrifikasyonu için fizibilite yapın.</li>
          <li><strong>Değer zinciri:</strong> Tedarikçilerden ürün karbon ayak izi talep edin, lojistikte düşük emisyonlu seçenekleri tercih edin.</li>
          <li><strong>Raporla:</strong> GHG Protocol / ISO 14064-1 uyumlu yıllık envanter hazırlayın; gerekiyorsa üçüncü taraf doğrulaması alın.</li>
        </ol>
      </div>`;
    bindCommon(root);

    if (actions.length) {
      makeChart('chPotential', {
        type: 'bar',
        data: {
          labels: actions.map((r) => r.title),
          datasets: [{ label: 'Potansiyel', data: actions.map((r) => r.potential / 1000), backgroundColor: PALETTE[0] }],
        },
        options: {
          indexAxis: 'y',
          scales: { x: { beginAtZero: true, ticks: tonTicks }, y: { ticks: { autoSkip: false, callback(v) { const l = this.getLabelForValue(v); return l.length > 28 ? l.slice(0, 27) + '…' : l; } } } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${fmt(ctx.parsed.x, 2)} tCO₂e/yıl` } } },
        },
      });
    }
  };

  // ---------------------------------------------------------------- Tesisler

  renderers.facilities = (root) => {
    const editing = ui.editingFacility ? state.facilities.find((f) => f.id === ui.editingFacility) : null;
    const f = editing || { type: 'Fabrika', baseYear: now.getFullYear() - 1, targetYear: 2030, reductionTarget: '' };
    const recordCount = (id) => Object.keys(state.records[id] || {}).length;

    root.innerHTML = `
      <div class="view-header">
        <div><h2>Tesisler</h2><p>Şirket, fabrika, ofis, depo gibi her bir lokasyonu ayrı tesis olarak tanımlayın.</p></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Kayıtlı tesisler (${state.facilities.length})</h3>
          ${state.facilities.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Ad</th><th>Tür</th><th>Şehir</th><th class="num">Çalışan</th><th class="num">Kayıtlı ay</th><th></th></tr></thead>
            <tbody>${state.facilities
              .map((x) => `<tr><td><strong>${esc(x.name)}</strong><br/><span class="muted" style="font-size:.8rem">${esc(x.sector || '')}</span></td><td>${esc(x.type || '')}</td><td>${esc(x.city || '')}</td><td class="num">${fmt(x.employees)}</td><td class="num">${recordCount(x.id)}</td>
                <td><div class="actions"><button class="btn secondary sm" data-fedit="${esc(x.id)}">Düzenle</button><button class="btn danger sm" data-fdel="${esc(x.id)}">Sil</button></div></td></tr>`)
              .join('')}</tbody></table></div>` : '<p class="muted">Henüz tesis yok. Sağdaki formdan ekleyin ya da örnek veriyi yükleyin.</p><button class="btn secondary" data-demo>Örnek veriyi yükle</button>'}
        </div>
        <form class="card" id="facilityForm" autocomplete="off">
          <h3>${editing ? 'Tesisi düzenle' : 'Yeni tesis ekle'}</h3>
          <div class="form-grid">
            <label class="field">Tesis adı *<input name="name" required maxlength="80" value="${esc(f.name)}" placeholder="ör. Gebze Üretim Tesisi" /></label>
            <label class="field">Tür<select name="type">${FACILITY_TYPES.map((x) => `<option ${x === f.type ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
            <label class="field">Sektör / faaliyet<input name="sector" maxlength="80" value="${esc(f.sector)}" placeholder="ör. Tekstil, gıda, otomotiv yan sanayi" /></label>
            <label class="field">Şehir<input name="city" maxlength="40" value="${esc(f.city)}" /></label>
            <label class="field">Çalışan sayısı<input name="employees" type="number" min="0" step="1" value="${esc(f.employees)}" /></label>
            <label class="field">Kapalı alan (m²)<input name="area" type="number" min="0" step="any" value="${esc(f.area)}" /></label>
            <label class="field">Üretim birimi<input name="productionUnit" maxlength="30" value="${esc(f.productionUnit)}" placeholder="ör. ton ürün, adet, m²" />
              <span class="unit">Birim ürün başına emisyon hesabı için</span></label>
          </div>
          <h3 style="margin-top:1.25rem">Azaltım hedefi (isteğe bağlı)</h3>
          <div class="form-grid">
            <label class="field">Baz yılı<input name="baseYear" type="number" min="2000" max="2100" value="${esc(f.baseYear)}" /></label>
            <label class="field">Hedef yılı<input name="targetYear" type="number" min="2000" max="2100" value="${esc(f.targetYear)}" /></label>
            <label class="field">Azaltım hedefi (%)<input name="reductionTarget" type="number" min="0" max="100" step="any" value="${esc(f.reductionTarget)}" placeholder="ör. 30" /></label>
          </div>
          <div class="actions" style="margin-top:1.25rem">
            <button class="btn" type="submit">${editing ? 'Değişiklikleri kaydet' : '+ Tesis ekle'}</button>
            ${editing ? '<button class="btn secondary" type="button" id="cancelEdit">Vazgeç</button>' : ''}
          </div>
        </form>
      </div>`;
    bindCommon(root);

    const form = $('#facilityForm', root);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (n) => form.elements[n].value.trim();
      const data = {
        name: v('name'),
        type: v('type'),
        sector: v('sector'),
        city: v('city'),
        employees: Calc.num(v('employees')),
        area: Calc.num(v('area')),
        productionUnit: v('productionUnit'),
        baseYear: v('baseYear') ? parseInt(v('baseYear'), 10) : '',
        targetYear: v('targetYear') ? parseInt(v('targetYear'), 10) : '',
        reductionTarget: v('reductionTarget') ? Calc.num(v('reductionTarget')) : '',
      };
      if (!data.name) return toast('Tesis adı zorunludur.');
      if (data.reductionTarget && data.targetYear <= data.baseYear) return toast('Hedef yılı baz yılından sonra olmalıdır.');
      if (editing) {
        Object.assign(editing, data);
        ui.editingFacility = null;
        persist('Tesis güncellendi.');
      } else {
        const nf = Object.assign({ id: Storage.uid() }, data);
        state.facilities.push(nf);
        state.records[nf.id] = {};
        ui.facility = nf.id;
        persist('Tesis eklendi. Şimdi "Veri Girişi" sekmesinden aylık verileri girebilirsiniz.');
      }
    });
    const cancel = $('#cancelEdit', root);
    if (cancel) cancel.addEventListener('click', () => { ui.editingFacility = null; render(); });
    $$('[data-fedit]', root).forEach((b) => b.addEventListener('click', () => { ui.editingFacility = b.dataset.fedit; render(); }));
    $$('[data-fdel]', root).forEach((b) => b.addEventListener('click', async () => {
      const x = state.facilities.find((y) => y.id === b.dataset.fdel);
      if (!x || !(await ask(`"${x.name}" ve ${recordCount(x.id)} aylık kaydı kalıcı olarak silinsin mi?`, 'Tesisi sil'))) return;
      state.facilities = state.facilities.filter((y) => y.id !== x.id);
      delete state.records[x.id];
      if (ui.editingFacility === x.id) ui.editingFacility = null;
      persist('Tesis silindi.');
    }));
  };

  // ---------------------------------------------------------------- Rapor

  renderers.report = (root) => {
    if (!state.facilities.length) {
      root.innerHTML = emptyFacilities();
      return bindCommon(root);
    }
    const fid = ui.facility;
    const year = ui.year;
    const f = Calc.facilityInfo(state, fid);
    const cur = Calc.aggregateYear(state, fid, year);
    const prev = Calc.aggregateYear(state, fid, year - 1);
    const tot = cur.total;
    const yoy = sameMonthsChange(cur, prev);
    const intens = Calc.intensities(state, fid, cur);
    const recs = Recommendations.generate(state, fid, year).filter((r) => r.type === 'action').slice(0, 6);
    const usedFactors = SOURCES.filter((s) => tot.activity[s.key]);
    const target = Calc.targetProgress(state, fid, year);

    root.innerHTML = `
      <div class="actions no-print" style="margin-bottom:1rem">
        <button class="btn" id="printBtn">Yazdır / PDF olarak kaydet</button>
        <button class="btn secondary" id="reportCsv">Özet tabloyu CSV indir</button>
      </div>
      <div class="card report-sheet">
        <h2>Sera Gazı Emisyon Raporu — ${year}</h2>
        <div class="report-meta">
          <strong>${esc(f.name)}</strong>${f.type ? ` · ${esc(f.type)}` : ''}${f.sector ? ` · ${esc(f.sector)}` : ''}${f.city ? ` · ${esc(f.city)}` : ''}<br/>
          Raporlama dönemi: Ocak–Aralık ${year} (${tot.monthsWithData}/12 ay veri) · Hazırlanma tarihi: ${now.toLocaleDateString('tr-TR')}<br/>
          Yöntem: GHG Protocol Kurumsal Standardı, operasyonel kontrol yaklaşımı · Birim: tCO₂e
        </div>

        <h3>1. Özet</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Kapsam</th><th>Açıklama</th><th class="num">${year} (tCO₂e)</th><th class="num">Pay</th><th class="num">${year - 1} (tCO₂e)</th></tr></thead>
          <tbody>
            ${[1, 2, 3].map((s) => `<tr><td>${SCOPES[s].name}</td><td>${SCOPES[s].desc}</td><td class="num">${t(tot.scopes[s])}</td><td class="num">%${fmt(tot.total ? (tot.scopes[s] / tot.total) * 100 : 0, 1)}</td><td class="num">${prev.total.monthsWithData ? t(prev.total.scopes[s]) : '—'}</td></tr>`).join('')}
            <tr class="total"><td colspan="2">Toplam</td><td class="num">${t(tot.total)}</td><td class="num">%100</td><td class="num">${prev.total.monthsWithData ? t(prev.total.total) : '—'}</td></tr>
          </tbody></table></div>
        <p>
          Geçen yılın aynı aylarına göre değişim: ${yoy.n ? pctHtml(yoy.pct) + ` (${yoy.n} ay)` : 'karşılaştırılabilir veri yok'}.
          ${intens.perEmployee !== null ? ` Çalışan başına: <strong>${t(intens.perEmployee)} tCO₂e/yıl</strong>.` : ''}
          ${intens.perProduction !== null ? ` Birim üretim başına: <strong>${fmt(intens.perProduction, 1)} kgCO₂e / ${esc(intens.productionUnit || 'birim')}</strong>.` : ''}
          ${target && !target.incompleteBase && target.current !== null ? ` Hedef: ${target.baseYear} bazına göre ${target.targetYear}'e kadar %${fmt(target.pct)} azaltım; gerçekleşen %${fmt(target.achievedPct, 1)} (${target.onTrack ? 'yolunda' : 'hedefin gerisinde'}).` : ''}
        </p>

        <h3>2. Kaynak bazında emisyonlar</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Kaynak</th><th>Kapsam</th><th class="num">Faaliyet verisi</th><th>Birim</th><th class="num">Faktör (kgCO₂e/birim)</th><th class="num">Emisyon (t)</th><th class="num">Pay</th></tr></thead>
          <tbody>
            ${usedFactors
              .map((s) => {
                const kg = tot.bySource[s.key] || 0;
                return `<tr><td>${esc(s.label)}</td><td>K${s.scope}</td><td class="num">${fmt(tot.activity[s.key], 0)}</td><td>${esc(s.unit)}</td><td class="num">${fmt(Calc.getFactor(s.key, state.factorOverrides), 3)}</td><td class="num">${t(kg)}</td><td class="num">%${fmt(tot.total ? (kg / tot.total) * 100 : 0, 1)}</td></tr>`;
              })
              .join('') || '<tr><td colspan="7">Veri yok</td></tr>'}
          </tbody></table></div>

        <h3 style="margin-top:1.25rem">3. Aylık emisyonlar (tCO₂e)</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Ay</th><th class="num">K1</th><th class="num">K2</th><th class="num">K3</th><th class="num">Toplam</th></tr></thead>
          <tbody>${cur.months.map((m, i) => `<tr class="${m.hasData ? '' : 'muted'}"><td>${MONTHS[i]}</td>${m.hasData ? `<td class="num">${t(m.scopes[1])}</td><td class="num">${t(m.scopes[2])}</td><td class="num">${t(m.scopes[3])}</td><td class="num">${t(m.total)}</td>` : '<td colspan="4">veri yok</td>'}</tr>`).join('')}
          <tr class="total"><td>Toplam</td><td class="num">${t(tot.scopes[1])}</td><td class="num">${t(tot.scopes[2])}</td><td class="num">${t(tot.scopes[3])}</td><td class="num">${t(tot.total)}</td></tr></tbody>
        </table></div>

        <h3 style="margin-top:1.25rem">4. Öncelikli azaltım önerileri</h3>
        ${recs.length ? `<ol>${recs.map((r) => `<li><strong>${esc(r.title)}</strong> — tahmini potansiyel ≈ ${t(r.potential)} tCO₂e/yıl. ${esc(r.text)}</li>`).join('')}</ol>` : '<p>Öneri üretmek için yeterli veri yok.</p>'}

        <h3 style="margin-top:1.25rem">5. Yöntem ve varsayımlar</h3>
        <p style="font-size:.85rem">Emisyonlar = faaliyet verisi × emisyon faktörü formülüyle hesaplanmıştır. Kapsam 2 emisyonları konum bazlı yöntemle (şebeke faktörü) hesaplanmış; YEK-G / I-REC belgeli veya öz üretim yenilenebilir elektrik için 0 faktörü kullanılmıştır (piyasa bazlı yaklaşım). Soğutucu gazlar için IPCC AR5 küresel ısınma potansiyelleri esas alınmıştır. Varsayılan faktörler yaklaşık değerlerdir; ${Object.keys(state.factorOverrides).length ? 'bazı faktörler kullanıcı tarafından güncellenmiştir.' : 'kullanıcı tarafından değiştirilmemiştir.'}</p>
      </div>`;

    const printBtn = $('#printBtn', root);
    if (framed) printBtn.hidden = true;
    else printBtn.addEventListener('click', () => window.print());
    $('#reportCsv', root).addEventListener('click', () => {
      const lines = [['ay', 'kapsam1_t', 'kapsam2_t', 'kapsam3_t', 'toplam_t'].join(';')];
      cur.months.forEach((m, i) => {
        if (m.hasData) lines.push([Calc.monthKey(year, i + 1), ...[1, 2, 3].map((s) => (m.scopes[s] / 1000).toFixed(3).replace('.', ',')), (m.total / 1000).toFixed(3).replace('.', ',')].join(';'));
      });
      lines.push(['toplam', ...[1, 2, 3].map((s) => (tot.scopes[s] / 1000).toFixed(3).replace('.', ',')), (tot.total / 1000).toFixed(3).replace('.', ',')].join(';'));
      download(`karbon-rapor-${slug(f.name)}-${year}.csv`, '﻿' + lines.join('\n'), 'text/csv;charset=utf-8');
    });
  };

  // ---------------------------------------------------------------- Faktörler ve Ayarlar

  renderers.settings = (root) => {
    const ov = state.factorOverrides;
    let lastScope = 0;
    root.innerHTML = `
      <div class="view-header">
        <div><h2>Emisyon Faktörleri & Ayarlar</h2><p>Varsayılan faktörleri kuruluşunuzun kullandığı güncel resmî değerlerle değiştirebilirsiniz. Değişiklik tüm geçmiş hesaplamalara uygulanır.</p></div>
      </div>
      <form class="card" id="factorForm">
        <div class="notice">Elektrik şebeke faktörü için Enerji ve Tabii Kaynaklar Bakanlığı'nın yayımladığı güncel Türkiye elektrik üretimi emisyon faktörünü kullanmanız önerilir.</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Kaynak</th><th>Birim</th><th class="num">Varsayılan (kgCO₂e/birim)</th><th style="width:180px">Kullanılan değer</th><th></th></tr></thead>
          <tbody>
          ${SOURCES.map((s) => {
            const head = s.scope !== lastScope ? `<tr class="total"><td colspan="5"><span class="tag s${s.scope}">K${s.scope}</span> ${SCOPES[s.scope].name} — ${SCOPES[s.scope].desc}</td></tr>` : '';
            lastScope = s.scope;
            const has = ov[s.key] !== undefined && ov[s.key] !== '';
            return `${head}<tr><td>${esc(s.label)}</td><td>${esc(s.unit)}</td><td class="num">${fmt(s.factor, 3)}</td>
              <td><input type="number" step="any" min="0" name="${s.key}" value="${has ? esc(ov[s.key]) : ''}" placeholder="${s.factor}" /></td>
              <td>${has ? '<span class="tag orta">özel</span>' : ''}</td></tr>`;
          }).join('')}
          </tbody></table></div>
        <div class="actions" style="margin-top:1rem">
          <button class="btn" type="submit">Faktörleri kaydet</button>
          <button class="btn secondary" type="button" id="resetFactors">Tümünü varsayılana döndür</button>
        </div>
      </form>

      <div class="card">
        <h3>Veri yönetimi</h3>
        <p>Tüm veriler yalnızca bu tarayıcıda (localStorage) saklanır. Düzenli olarak yedek alın; başka bir bilgisayara aktarmak için yedek dosyasını içe aktarın.</p>
        <div class="actions">
          <button class="btn" id="exportJson">Yedek al (JSON)</button>
          <label class="btn secondary">Yedekten geri yükle<input type="file" id="importJson" accept=".json,application/json" hidden /></label>
          <button class="btn secondary" data-demo>Örnek veriyi yükle</button>
          <button class="btn danger" id="clearAll">Tüm verileri sil</button>
        </div>
      </div>`;
    bindCommon(root);

    const form = $('#factorForm', root);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = {};
      for (const s of SOURCES) {
        const v = form.elements[s.key].value.trim();
        if (v === '') continue;
        const n = Calc.num(v);
        if (n < 0) return toast(`${s.label} için faktör negatif olamaz.`);
        if (n !== s.factor) next[s.key] = n;
      }
      state.factorOverrides = next;
      persist('Emisyon faktörleri kaydedildi.');
    });
    $('#resetFactors', root).addEventListener('click', async () => {
      if (!(await ask('Tüm özel faktörler silinip varsayılan değerlere dönülsün mü?'))) return;
      state.factorOverrides = {};
      persist('Varsayılan faktörlere dönüldü.');
    });
    $('#exportJson', root).addEventListener('click', () => {
      download(`karbon-ayak-izi-yedek-${now.toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
    });
    $('#importJson', root).addEventListener('change', async (e) => {
      try {
        const data = Storage.normalize(JSON.parse(await readFile(e.target)));
        if (!data.facilities.length) throw new Error('Dosyada tesis bulunamadı.');
        if (!(await ask(`${data.facilities.length} tesis içeren yedek yüklenecek. Mevcut veriler silinecek. Devam edilsin mi?`, 'Geri yükle'))) return;
        state = data;
        ui.facility = null;
        ui.cmp = {};
        persist('Yedek geri yüklendi.');
      } catch (err) {
        toast('Yedek okunamadı: ' + err.message);
      } finally {
        e.target.value = '';
      }
    });
    $('#clearAll', root).addEventListener('click', async () => {
      if (!(await ask('TÜM tesisler, kayıtlar ve özel faktörler kalıcı olarak silinecek. Emin misiniz?', 'Tümünü sil'))) return;
      state = Storage.emptyState();
      ui.facility = null;
      ui.cmp = {};
      persist('Tüm veriler silindi.');
    });
  };

  // ---------------------------------------------------------------- başlatma

  function init() {
    $$('.tabs button').forEach((b) => b.addEventListener('click', () => {
      ui.view = b.dataset.view;
      render();
    }));
    $('#facilitySelect').addEventListener('change', (e) => {
      ui.facility = e.target.value || null;
      ui.entryMonth = null;
      ui.cmp = {};
      render();
    });
    $('#yearSelect').addEventListener('change', (e) => {
      ui.year = Number(e.target.value);
      ui.entryMonth = null;
      ui.cmp = {};
      render();
    });
    if (!state.facilities.length) ui.view = 'dashboard';
    refreshSelectors();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
