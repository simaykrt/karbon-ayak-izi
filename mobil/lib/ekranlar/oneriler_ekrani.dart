import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import '../veri/model.dart';

/// Web uygulamasının ürettiği azaltım önerileri ve uyarılar.
class OnerilerEkrani extends StatelessWidget {
  const OnerilerEkrani({super.key});

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final yayin = durum.yayin!;
    final tesis = durum.seciliTesis ?? (yayin.tesisler.length == 1 ? yayin.tesisler.first : null);
    final oneriler = tesis?.oneriler ?? yayin.genelOneriler;
    final eylemler = oneriler.where((o) => o.tur == 'action').toList();
    final uyarilar = oneriler.where((o) => o.tur != 'action').toList();
    final potansiyel = eylemler.fold<double>(0, (s, o) => s + (o.potansiyel ?? 0));

    return RefreshIndicator(
      onRefresh: durum.yenile,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const SeciciSerit(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              'Öneriler ${yayin.raporYili} verilerine göre web uygulamasında hesaplanır. '
              '${eylemler.isEmpty ? '' : 'Toplam tahmini azaltım potansiyeli: yılda yaklaşık ${ton(potansiyel)} t CO2e.'}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          if (oneriler.isEmpty) const BosDurum('Bu seçim için öneri yok.'),
          if (uyarilar.isNotEmpty) ...[
            const _AraBaslik('Uyarılar ve bilgilendirmeler'),
            for (final o in uyarilar) _OneriKarti(o),
          ],
          if (eylemler.isNotEmpty) ...[
            const _AraBaslik('Azaltım önerileri'),
            for (final o in eylemler) _OneriKarti(o),
          ],
        ],
      ),
    );
  }
}

class _AraBaslik extends StatelessWidget {
  const _AraBaslik(this.metin);

  final String metin;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Text(metin, style: Theme.of(context).textTheme.titleSmall),
      );
}

class _OneriKarti extends StatelessWidget {
  const _OneriKarti(this.oneri);

  final Oneri oneri;

  Color get _oncelikRengi => switch (oneri.oncelik) {
        'yüksek' => kotuRenk,
        'orta' => kapsamRenkleri[1],
        _ => Colors.grey,
      };

  @override
  Widget build(BuildContext context) {
    final arkaPlan = switch (oneri.tur) {
      'warning' => const Color(0xFFFBF3DF),
      'info' => const Color(0xFFEAF0F5),
      _ => null,
    };
    return Card(
      color: arkaPlan,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: ExpansionTile(
        shape: const Border(),
        title: Text(oneri.baslik, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _Etiket(oneri.oncelik, _oncelikRengi),
              if (oneri.kategori.isNotEmpty) Text(oneri.kategori, style: const TextStyle(fontSize: 12)),
              if (oneri.potansiyel != null)
                Text(
                  '≈ −${ton(oneri.potansiyel!)} t/yıl',
                  style: const TextStyle(fontSize: 12, color: iyiRenk, fontWeight: FontWeight.w600),
                ),
            ],
          ),
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [Text(oneri.metin, style: const TextStyle(fontSize: 14, height: 1.4))],
      ),
    );
  }
}

class _Etiket extends StatelessWidget {
  const _Etiket(this.metin, this.renk);

  final String metin;
  final Color renk;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: renk.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
        child: Text('Öncelik: $metin', style: TextStyle(fontSize: 11, color: renk, fontWeight: FontWeight.w600)),
      );
}
