/// Ekranlarda ortak kullanılan renkler, sayı biçimleri ve küçük bileşenler.
library;

import 'package:flutter/material.dart';

import '../veri/durum.dart';

const anaRenk = Color(0xFF2F6B4F);
const kapsamRenkleri = [Color(0xFFB85A3E), Color(0xFFC7962C), Color(0xFF4C7196)];
const kapsamAdlari = ['Kapsam 1', 'Kapsam 2', 'Kapsam 3'];
const iyiRenk = Color(0xFF2F6B4F);
const kotuRenk = Color(0xFFB23B2E);

/// Türkçe sayı biçimi: 12345.6 -> "12.345,6"
String sayi(double v, [int basamak = 0]) {
  final negatif = v < 0;
  final parcalar = v.abs().toStringAsFixed(basamak).split('.');
  final tam = parcalar[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
  final sonuc = parcalar.length > 1 ? '$tam,${parcalar[1]}' : tam;
  return negatif ? '-$sonuc' : sonuc;
}

/// kg CO2e -> ton gösterimi
String ton(double kg, [int basamak = 1]) => sayi(kg / 1000, basamak);

/// Değişim yüzdesi: artış kırmızı (kötü), azalış yeşil (iyi)
class DegisimEtiketi extends StatelessWidget {
  const DegisimEtiketi(this.yuzde, {super.key, this.boyut = 13});

  final double? yuzde;
  final double boyut;

  @override
  Widget build(BuildContext context) {
    final y = yuzde;
    if (y == null) return Text('—', style: TextStyle(fontSize: boyut));
    final renk = y > 0 ? kotuRenk : iyiRenk;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(y > 0 ? Icons.arrow_drop_up : Icons.arrow_drop_down, color: renk, size: boyut + 8),
        Text('%${sayi(y.abs(), 1)}', style: TextStyle(color: renk, fontWeight: FontWeight.w600, fontSize: boyut)),
      ],
    );
  }
}

/// Başlıklı içerik bloğu
class Bolum extends StatelessWidget {
  const Bolum({super.key, required this.baslik, required this.child, this.sag});

  final String baslik;
  final Widget child;
  final Widget? sag;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(baslik, style: Theme.of(context).textTheme.titleSmall)),
                if (sag != null) sag!,
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

/// Ekranların üstündeki tesis ve yıl seçicisi
class SeciciSerit extends StatelessWidget {
  const SeciciSerit({super.key});

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final yayin = durum.yayin!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: DropdownButtonFormField<String?>(
              key: ValueKey('tesis-${durum.seciliTesisId}'),
              initialValue: durum.seciliTesisId,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Tesis', isDense: true, border: OutlineInputBorder()),
              items: [
                if (yayin.tesisler.length > 1)
                  const DropdownMenuItem<String?>(value: null, child: Text('Tüm tesisler')),
                for (final t in yayin.tesisler)
                  DropdownMenuItem<String?>(value: t.id, child: Text(t.ad, overflow: TextOverflow.ellipsis)),
              ],
              onChanged: durum.tesisSec,
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 104,
            child: DropdownButtonFormField<int>(
              key: ValueKey('yil-${durum.yil}'),
              initialValue: durum.yil,
              decoration: const InputDecoration(labelText: 'Yıl', isDense: true, border: OutlineInputBorder()),
              items: [for (final y in yayin.yillar) DropdownMenuItem(value: y, child: Text('$y'))],
              onChanged: (y) => durum.yilSec(y!),
            ),
          ),
        ],
      ),
    );
  }
}

/// Veri yokken gösterilen bilgi
class BosDurum extends StatelessWidget {
  const BosDurum(this.mesaj, {super.key});

  final String mesaj;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(child: Text(mesaj, textAlign: TextAlign.center)),
    );
  }
}
