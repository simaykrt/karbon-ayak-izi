import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import '../veri/model.dart';
import '../veri/ozet.dart';
import 'tesis_detay_ekrani.dart';

IconData tesisIkonu(String tur) {
  if (tur.startsWith('Fabrika')) return Icons.factory_outlined;
  if (tur.startsWith('Depo')) return Icons.warehouse_outlined;
  if (tur.startsWith('Otel')) return Icons.hotel_outlined;
  return Icons.apartment_outlined;
}

/// Tesislerin ızgara görünümü; karta dokununca tesisin detay sayfası açılır.
class TesislerEkrani extends StatelessWidget {
  const TesislerEkrani({super.key});

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final tesisler = durum.gorunurTesisler;
    final yil = durum.yil;

    return Column(
      children: [
        const SeciciSerit(tesisGoster: false),
        Expanded(
          child: RefreshIndicator(
            onRefresh: durum.yenile,
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 260,
                mainAxisExtent: 168,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: tesisler.length,
              itemBuilder: (context, i) => _TesisKarti(tesisler[i], yil),
            ),
          ),
        ),
      ],
    );
  }
}

class _TesisKarti extends StatelessWidget {
  const _TesisKarti(this.tesis, this.yil);

  final Tesis tesis;
  final int yil;

  @override
  Widget build(BuildContext context) {
    final buYil = yilOzeti([tesis], yil);
    final kiyas = ayniAylarKarsilastir(buYil, yilOzeti([tesis], yil - 1));
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TesisDetayEkrani(tesis: tesis))),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(tesisIkonu(tesis.tur), size: 20, color: anaRenk),
                  const SizedBox(width: 6),
                  Expanded(child: Text(tesis.sehir, style: const TextStyle(fontSize: 12, color: soluk))),
                ],
              ),
              const SizedBox(height: 8),
              Text(tesis.ad,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.25)),
              const Spacer(),
              Text.rich(TextSpan(children: [
                TextSpan(
                    text: ton(buYil.toplam.toplam, 0),
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()])),
                const TextSpan(text: ' t', style: TextStyle(fontSize: 12, color: soluk)),
              ])),
              Row(
                children: [
                  Text('$yil · ${buYil.veriliAySayisi} ay', style: const TextStyle(fontSize: 11, color: soluk)),
                  const Spacer(),
                  DegisimEtiketi(kiyas.yuzde, boyut: 11),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
