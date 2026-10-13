import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import '../veri/ozet.dart';

/// Seçili tesis ve yılın özet göstergeleri, aylık grafik ve en büyük kaynaklar.
class OzetEkrani extends StatelessWidget {
  const OzetEkrani({super.key});

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final yayin = durum.yayin!;
    final tesisler = durum.seciliTesisler;
    final buYil = yilOzeti(tesisler, durum.yil);
    final gecenYil = yilOzeti(tesisler, durum.yil - 1);
    final kiyas = ayniAylarKarsilastir(buYil, gecenYil);
    final toplam = buYil.toplam;
    final calisan = tesisler.fold<int>(0, (s, t) => s + t.calisan);
    final tesis = durum.seciliTesis;
    final hedef = tesis == null ? null : hedefDurumu(tesis, durum.yil);

    return RefreshIndicator(
      onRefresh: durum.yenile,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const SeciciSerit(),
          if (!toplam.veriVar)
            BosDurum('${durum.yil} yılı için veri yok.')
          else ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: _Gosterge(
                      baslik: 'Toplam emisyon',
                      deger: ton(toplam.toplam),
                      birim: 't CO2e',
                      alt: Row(children: [
                        const Text('Geçen yıla göre ', style: TextStyle(fontSize: 12)),
                        DegisimEtiketi(kiyas.yuzde, boyut: 12),
                      ]),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _Gosterge(
                      baslik: 'Çalışan başına',
                      deger: calisan == 0 ? '—' : ton(toplam.toplam * 12 / buYil.veriliAySayisi / calisan, 2),
                      birim: 't / yıl',
                      alt: Text('${buYil.veriliAySayisi}/12 ay veri', style: const TextStyle(fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ),
            Bolum(
              baslik: 'Kapsamlara göre dağılım',
              child: Column(
                children: [
                  for (var i = 0; i < 3; i++)
                    _PayCubugu(
                      etiket: kapsamAdlari[i],
                      deger: toplam.kapsamlar[i],
                      toplam: toplam.toplam,
                      renk: kapsamRenkleri[i],
                    ),
                ],
              ),
            ),
            Bolum(
              baslik: 'Aylık emisyonlar (t CO2e)',
              child: SizedBox(height: 220, child: _AylikGrafik(buYil)),
            ),
            Bolum(
              baslik: 'En büyük 5 kaynak',
              child: Column(
                children: [
                  for (final e in toplam.siraliKaynaklar.take(5))
                    _PayCubugu(
                      etiket: yayin.kaynaklar[e.key]?.ad ?? e.key,
                      deger: e.value,
                      toplam: toplam.toplam,
                      renk: kapsamRenkleri[(yayin.kaynaklar[e.key]?.kapsam ?? 1) - 1],
                    ),
                ],
              ),
            ),
            if (hedef != null)
              Bolum(
                baslik: 'Azaltım hedefi: ${tesis!.hedef!.hedefYili} yılına kadar %${sayi(tesis.hedef!.yuzde)}',
                sag: Chip(
                  label: Text(hedef.yolunda ? 'Yolunda' : 'Gerisinde'),
                  backgroundColor: (hedef.yolunda ? iyiRenk : kotuRenk).withValues(alpha: 0.12),
                  side: BorderSide.none,
                  visualDensity: VisualDensity.compact,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LinearProgressIndicator(
                      value: (hedef.gerceklesen / tesis.hedef!.yuzde).clamp(0.0, 1.0),
                      minHeight: 8,
                      color: hedef.yolunda ? iyiRenk : kotuRenk,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${tesis.hedef!.bazYili} yılına göre %${sayi(hedef.gerceklesen, 1)} azaltım. '
                      '${durum.yil} için beklenen seviye ${ton(hedef.beklenen)} t, '
                      'yıl sonu tahmini ${ton(hedef.yillikMevcut)} t.',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _Gosterge extends StatelessWidget {
  const _Gosterge({required this.baslik, required this.deger, required this.birim, required this.alt});

  final String baslik;
  final String deger;
  final String birim;
  final Widget alt;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(baslik, style: tema.textTheme.labelMedium),
            const SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text.rich(TextSpan(children: [
                TextSpan(text: deger, style: tema.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
                TextSpan(text: ' $birim', style: tema.textTheme.bodySmall),
              ])),
            ),
            const SizedBox(height: 4),
            alt,
          ],
        ),
      ),
    );
  }
}

/// Etiket, ton değeri ve toplam içindeki payı gösteren yatay çubuk
class _PayCubugu extends StatelessWidget {
  const _PayCubugu({required this.etiket, required this.deger, required this.toplam, required this.renk});

  final String etiket;
  final double deger;
  final double toplam;
  final Color renk;

  @override
  Widget build(BuildContext context) {
    final pay = toplam == 0 ? 0.0 : deger / toplam;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(etiket, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
              Text('${ton(deger)} t · %${sayi(pay * 100, 1)}', style: const TextStyle(fontSize: 13)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: pay,
              minHeight: 6,
              color: renk,
              backgroundColor: renk.withValues(alpha: 0.12),
            ),
          ),
        ],
      ),
    );
  }
}

/// Aylık emisyonları kapsamlara göre yığılmış sütun grafik olarak çizer.
class _AylikGrafik extends StatelessWidget {
  const _AylikGrafik(this.ozet);

  final YilOzeti ozet;

  @override
  Widget build(BuildContext context) {
    return BarChart(
      BarChartData(
        barGroups: [
          for (var i = 0; i < 12; i++)
            BarChartGroupData(x: i, barRods: [
              BarChartRodData(
                toY: ozet.aylar[i].toplam / 1000,
                width: 14,
                borderRadius: BorderRadius.zero,
                rodStackItems: _yiginlar(ozet.aylar[i].kapsamlar),
              ),
            ]),
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
            getTooltipItem: (grup, _, cubuk, __) => BarTooltipItem(
              '${aylar[grup.x]}\n${sayi(cubuk.toY, 1)} t',
              const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ),
      ),
    );
  }

  static List<BarChartRodStackItem> _yiginlar(List<double> kapsamlar) {
    final ogeler = <BarChartRodStackItem>[];
    var alt = 0.0;
    for (var i = 0; i < 3; i++) {
      final ust = alt + kapsamlar[i] / 1000;
      ogeler.add(BarChartRodStackItem(alt, ust, kapsamRenkleri[i]));
      alt = ust;
    }
    return ogeler;
  }
}
