import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/model.dart';
import 'ozet_ekrani.dart';
import 'tesisler_ekrani.dart';

/// Tek bir tesisin özet sayfası (Tesisler ızgarasından açılır).
class TesisDetayEkrani extends StatelessWidget {
  const TesisDetayEkrani({super.key, required this.tesis});

  final Tesis tesis;

  @override
  Widget build(BuildContext context) {
    final bilgiler = [
      tesis.tur,
      tesis.sehir,
      if (tesis.calisan > 0) '${sayi(tesis.calisan.toDouble())} çalışan',
      if (tesis.hedef != null) '${tesis.hedef!.hedefYili} hedefi %${sayi(tesis.hedef!.yuzde)}',
    ].where((b) => b.isNotEmpty).join(' · ');

    return Scaffold(
      appBar: AppBar(title: Text(tesis.ad)),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: Row(
              children: [
                Icon(tesisIkonu(tesis.tur), size: 18, color: anaRenk),
                const SizedBox(width: 8),
                Expanded(child: Text(bilgiler, style: const TextStyle(fontSize: 13, color: soluk))),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(child: OzetEkrani(sabitTesis: tesis)),
        ],
      ),
    );
  }
}
