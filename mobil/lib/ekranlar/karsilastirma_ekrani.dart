import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import '../veri/model.dart';
import '../veri/ozet.dart';

enum _Gorunum { yillik, aylik, tesisler }

/// Yıl ↔ yıl, ay ↔ ay ve tesis ↔ tesis karşılaştırmaları.
class KarsilastirmaEkrani extends StatefulWidget {
  const KarsilastirmaEkrani({super.key});

  @override
  State<KarsilastirmaEkrani> createState() => _KarsilastirmaEkraniState();
}

class _KarsilastirmaEkraniState extends State<KarsilastirmaEkrani> {
  _Gorunum gorunum = _Gorunum.yillik;
  int? seciliAy;

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final cokTesis = durum.yayin!.tesisler.length > 1;
    if (!cokTesis && gorunum == _Gorunum.tesisler) gorunum = _Gorunum.yillik;

    return RefreshIndicator(
      onRefresh: durum.yenile,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const SeciciSerit(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SegmentedButton<_Gorunum>(
              segments: [
                const ButtonSegment(value: _Gorunum.yillik, label: Text('Yıllık')),
                const ButtonSegment(value: _Gorunum.aylik, label: Text('Aylık')),
                if (cokTesis) const ButtonSegment(value: _Gorunum.tesisler, label: Text('Tesisler')),
              ],
              selected: {gorunum},
              onSelectionChanged: (s) => setState(() => gorunum = s.first),
            ),
          ),
          switch (gorunum) {
            _Gorunum.yillik => _yillik(durum),
            _Gorunum.aylik => _aylik(durum),
            _Gorunum.tesisler => _tesisler(durum),
          },
        ],
      ),
    );
  }

  Widget _yillik(UygulamaDurumu durum) {
    final a = yilOzeti(durum.seciliTesisler, durum.yil);
    final b = yilOzeti(durum.seciliTesisler, durum.yil - 1);
    if (!a.toplam.veriVar || !b.toplam.veriVar) {
      return BosDurum('${durum.yil} ile ${durum.yil - 1} yıllarını karşılaştırmak için iki yılın da verisi gerekir.');
    }
    final kiyas = ayniAylarKarsilastir(a, b);

    // Kaynak bazında fark: yalnızca iki yılda da verisi olan aylar
    final farklar = <String, double>{};
    for (var i = 0; i < 12; i++) {
      if (!a.aylar[i].veriVar || !b.aylar[i].veriVar) continue;
      for (final k in {...a.aylar[i].kaynaklar.keys, ...b.aylar[i].kaynaklar.keys}) {
        farklar[k] = (farklar[k] ?? 0) + (a.aylar[i].kaynaklar[k] ?? 0) - (b.aylar[i].kaynaklar[k] ?? 0);
      }
    }
    final siraliFarklar = farklar.entries.toList()..sort((x, y) => y.value.abs().compareTo(x.value.abs()));

    return Column(
      children: [
        Bolum(
          baslik: '${durum.yil} ve ${durum.yil - 1} (aynı ${kiyas.ortakAy} ay)',
          sag: DegisimEtiketi(kiyas.yuzde, boyut: 15),
          child: Column(
            children: [
              Row(
                children: [
                  _Lejant(anaRenk, '${durum.yil}: ${ton(kiyas.simdiki)} t'),
                  const SizedBox(width: 16),
                  _Lejant(Colors.grey, '${durum.yil - 1}: ${ton(kiyas.onceki)} t'),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(height: 200, child: _IkiYilGrafigi(a, b)),
            ],
          ),
        ),
        Bolum(
          baslik: 'En çok değişen kaynaklar',
          child: Column(
            children: [
              for (final e in siraliFarklar.take(6))
                _Satir(
                  durum.yayin!.kaynaklar[e.key]?.ad ?? e.key,
                  Text(
                    '${e.value > 0 ? '+' : ''}${ton(e.value)} t',
                    style: TextStyle(color: e.value > 0 ? kotuRenk : iyiRenk, fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _aylik(UygulamaDurumu durum) {
    final ozet = yilOzeti(durum.seciliTesisler, durum.yil);
    final veriliAylar = [
      for (var i = 1; i <= 12; i++)
        if (ozet.aylar[i - 1].veriVar) i
    ];
    if (veriliAylar.isEmpty) return BosDurum('${durum.yil} yılı için veri yok.');
    final ay = veriliAylar.contains(seciliAy) ? seciliAy! : veriliAylar.last;

    final simdi = ozet.aylar[ay - 1];
    final oncekiAy = ay == 1 ? yilOzeti(durum.seciliTesisler, durum.yil - 1).aylar[11] : ozet.aylar[ay - 2];
    final gecenYil = yilOzeti(durum.seciliTesisler, durum.yil - 1).aylar[ay - 1];

    Widget hucre(double simdiki, Toplam onceki, double oncekiDeger) =>
        onceki.veriVar ? DegisimEtiketi(yuzdeDegisim(simdiki, oncekiDeger)) : const Text('—');

    return Bolum(
      baslik: 'Ay seçin',
      sag: DropdownButton<int>(
        value: ay,
        underline: const SizedBox(),
        items: [for (final a in veriliAylar) DropdownMenuItem(value: a, child: Text(aylar[a - 1]))],
        onChanged: (a) => setState(() => seciliAy = a),
      ),
      child: Table(
        columnWidths: const {0: FlexColumnWidth(1.4), 1: FlexColumnWidth(), 2: FlexColumnWidth(), 3: FlexColumnWidth()},
        defaultVerticalAlignment: TableCellVerticalAlignment.middle,
        children: [
          const TableRow(children: [
            _Baslik(''),
            _Baslik('Ton'),
            _Baslik('Önceki aya göre'),
            _Baslik('Geçen yıla göre'),
          ]),
          _tabloSatiri('Toplam', simdi.toplam, hucre(simdi.toplam, oncekiAy, oncekiAy.toplam),
              hucre(simdi.toplam, gecenYil, gecenYil.toplam),
              kalin: true),
          for (var i = 0; i < 3; i++)
            _tabloSatiri(
                kapsamAdlari[i],
                simdi.kapsamlar[i],
                hucre(simdi.kapsamlar[i], oncekiAy, oncekiAy.kapsamlar[i]),
                hucre(simdi.kapsamlar[i], gecenYil, gecenYil.kapsamlar[i])),
        ],
      ),
    );
  }

  TableRow _tabloSatiri(String ad, double kg, Widget b, Widget c, {bool kalin = false}) {
    final stil = TextStyle(fontSize: 13, fontWeight: kalin ? FontWeight.w600 : FontWeight.normal);
    return TableRow(children: [
      Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text(ad, style: stil)),
      Text(ton(kg), style: stil),
      b,
      c,
    ]);
  }

  Widget _tesisler(UygulamaDurumu durum) {
    final satirlar = [
      for (final Tesis t in durum.yayin!.tesisler)
        (
          tesis: t,
          buYil: yilOzeti([t], durum.yil),
          kiyas: ayniAylarKarsilastir(yilOzeti([t], durum.yil), yilOzeti([t], durum.yil - 1)),
        ),
    ]..sort((x, y) => y.buYil.toplam.toplam.compareTo(x.buYil.toplam.toplam));
    final enBuyuk = satirlar.first.buYil.toplam.toplam;

    return Bolum(
      baslik: 'Tesislerin ${durum.yil} emisyonları',
      child: Column(
        children: [
          for (final s in satirlar)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(child: Text(s.tesis.ad, style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text('${ton(s.buYil.toplam.toplam)} t'),
                  ]),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: enBuyuk == 0 ? 0 : s.buYil.toplam.toplam / enBuyuk,
                    minHeight: 6,
                    color: anaRenk,
                    backgroundColor: anaRenk.withValues(alpha: 0.12),
                  ),
                  const SizedBox(height: 4),
                  Row(children: [
                    Expanded(
                      child: Text(
                        s.tesis.calisan == 0 || s.buYil.veriliAySayisi == 0
                            ? s.tesis.tur
                            : '${s.tesis.tur} · çalışan başına '
                                '${ton(s.buYil.toplam.toplam * 12 / s.buYil.veriliAySayisi / s.tesis.calisan, 2)} t/yıl',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    DegisimEtiketi(s.kiyas.yuzde, boyut: 12),
                  ]),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Baslik extends StatelessWidget {
  const _Baslik(this.metin);

  final String metin;

  @override
  Widget build(BuildContext context) => Text(metin, style: Theme.of(context).textTheme.labelSmall);
}

class _Satir extends StatelessWidget {
  const _Satir(this.ad, this.deger);

  final String ad;
  final Widget deger;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Expanded(child: Text(ad, style: const TextStyle(fontSize: 13))),
          deger,
        ]),
      );
}

class _Lejant extends StatelessWidget {
  const _Lejant(this.renk, this.metin);

  final Color renk;
  final String metin;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 10, color: renk),
        const SizedBox(width: 6),
        Text(metin, style: const TextStyle(fontSize: 12)),
      ]);
}

/// İki yılın aylık toplamlarını yan yana sütunlarla gösterir.
class _IkiYilGrafigi extends StatelessWidget {
  const _IkiYilGrafigi(this.a, this.b);

  final YilOzeti a;
  final YilOzeti b;

  @override
  Widget build(BuildContext context) {
    BarChartRodData cubuk(Toplam t, Color renk) =>
        BarChartRodData(toY: t.toplam / 1000, color: renk, width: 7, borderRadius: BorderRadius.zero);

    return BarChart(
      BarChartData(
        barGroups: [
          for (var i = 0; i < 12; i++)
            BarChartGroupData(
                x: i, barsSpace: 1, barRods: [cubuk(a.aylar[i], anaRenk), cubuk(b.aylar[i], Colors.grey)]),
        ],
        gridData: const FlGridData(drawVerticalLine: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 44,
              getTitlesWidget: (v, meta) =>
                  v == meta.max ? const SizedBox.shrink() : Text(sayi(v), style: const TextStyle(fontSize: 10)),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, meta) => Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(kisaAylar[v.toInt()], style: const TextStyle(fontSize: 9)),
              ),
            ),
          ),
        ),
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (grup, _, cubuk, i) => BarTooltipItem(
              '${aylar[grup.x]} ${i == 0 ? a.yil : b.yil}\n${sayi(cubuk.toY, 1)} t',
              const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ),
      ),
    );
  }
}
