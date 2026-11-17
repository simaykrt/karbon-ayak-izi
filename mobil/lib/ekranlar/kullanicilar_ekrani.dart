import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import '../veri/kullanici.dart';
import 'ana_sayfa.dart';

/// Sistem yöneticisi: kullanıcıları listeler ve istediği kullanıcının
/// ekranlarını o kullanıcı gibi açar. Hesaplar web uygulamasında yönetilir.
class KullanicilarEkrani extends StatefulWidget {
  const KullanicilarEkrani({super.key});

  @override
  State<KullanicilarEkrani> createState() => _KullanicilarEkraniState();
}

class _KullanicilarEkraniState extends State<KullanicilarEkrani> {
  final _arama = TextEditingController();
  Rol? _rolFiltresi;

  @override
  void dispose() {
    _arama.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final aranan = _arama.text.trim().toLowerCase();
    final liste = durum.kullanicilar
        .where((k) => _rolFiltresi == null || k.rol == _rolFiltresi)
        .where((k) => aranan.isEmpty || k.adSoyad.toLowerCase().contains(aranan) || k.eposta.contains(aranan))
        .toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            controller: _arama,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Ad veya e-posta ara',
              prefixIcon: const Icon(Icons.search),
              isDense: true,
              suffixIcon: _arama.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(_arama.clear),
                    ),
            ),
          ),
        ),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              for (final r in [null, ...Rol.values])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(r?.ad ?? 'Tümü'),
                    selected: _rolFiltresi == r,
                    onSelected: (_) => setState(() => _rolFiltresi = r),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(
            children: [
              Text('${liste.length} kullanıcı', style: const TextStyle(fontSize: 12, color: soluk)),
              const Spacer(),
              const Text('Ekleme ve düzenleme web uygulamasında', style: TextStyle(fontSize: 12, color: soluk)),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.only(bottom: 24),
            itemCount: liste.length,
            separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, i) => _KullaniciSatiri(liste[i]),
          ),
        ),
      ],
    );
  }
}

class _KullaniciSatiri extends StatelessWidget {
  const _KullaniciSatiri(this.k);

  final Kullanici k;

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final tesisAdlari = {for (final t in durum.yayin!.tesisler) t.id: t.ad};
    final tesisler = k.rol.tumTesisler ? 'Tüm tesisler' : k.tesisler.map((id) => tesisAdlari[id] ?? id).join(', ');
    return ListTile(
      tileColor: Colors.white,
      leading: RolAvatari(k),
      title: Row(
        children: [
          Flexible(child: Text(k.adSoyad, overflow: TextOverflow.ellipsis)),
          if (k.id == durum.oturum?.id) const _Etiket('siz', acikYesil, anaRenk),
          if (!k.aktif) const _Etiket('pasif', Color(0xFFECEEEA), soluk),
        ],
      ),
      subtitle: Text('${k.rol.ad} · $tesisler', maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => _ayrinti(context, k, tesisler),
    );
  }

  void _ayrinti(BuildContext context, Kullanici k, String tesisler) {
    final durum = DurumKapsami.of(context);
    final kendisi = k.id == durum.oturum?.id;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (c) => Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(c).padding.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                RolAvatari(k, yaricap: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(k.adSoyad, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                      Text(k.eposta, style: const TextStyle(color: soluk)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _Bilgi('Rol', k.rol.ad),
            _Bilgi('Tesisler', tesisler),
            _Bilgi('Durum', k.aktif ? 'Aktif' : 'Pasif'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.visibility_outlined),
                label: Text(kendisi ? 'Şu an bu hesaptasınız' : 'Bu kullanıcının ekranlarını aç'),
                onPressed: kendisi || !k.aktif
                    ? null
                    : () {
                        final gezgin = Navigator.of(context);
                        gezgin.pop();
                        durum.gorunenAyarla(k);
                        gezgin
                            .push(MaterialPageRoute(builder: (_) => const AnaSayfa()))
                            .then((_) => durum.gorunenAyarla(durum.oturum));
                      },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bilgi extends StatelessWidget {
  const _Bilgi(this.ad, this.deger);

  final String ad;
  final String deger;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 80, child: Text(ad, style: const TextStyle(color: soluk))),
            Expanded(child: Text(deger)),
          ],
        ),
      );
}

class _Etiket extends StatelessWidget {
  const _Etiket(this.metin, this.zemin, this.renk);

  final String metin;
  final Color zemin;
  final Color renk;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(left: 6),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        decoration: BoxDecoration(color: zemin, borderRadius: BorderRadius.circular(3)),
        child: Text(metin, style: TextStyle(fontSize: 11, color: renk, fontWeight: FontWeight.w600)),
      );
}
