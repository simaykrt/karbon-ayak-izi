import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import '../veri/kullanici.dart';
import 'giris_ekrani.dart';
import 'karsilastirma_ekrani.dart';
import 'kullanicilar_ekrani.dart';
import 'oneriler_ekrani.dart';
import 'ozet_ekrani.dart';
import 'tesisler_ekrani.dart';

class _Sekme {
  const _Sekme(this.ad, this.ikon, this.ekran);

  final String ad;
  final IconData ikon;
  final Widget ekran;
}

/// Rolüne göre hangi sekmelerin açılacağı
List<_Sekme> _sekmeler(Rol rol) {
  const ozet = _Sekme('Özet', Icons.insights_outlined, OzetEkrani());
  const tesisler = _Sekme('Tesisler', Icons.grid_view_outlined, TesislerEkrani());
  const karsilastirma = _Sekme('Karşılaştırma', Icons.compare_arrows, KarsilastirmaEkrani());
  const oneriler = _Sekme('Öneriler', Icons.lightbulb_outline, OnerilerEkrani());
  const kullanicilar = _Sekme('Kullanıcılar', Icons.people_outline, KullanicilarEkrani());
  return switch (rol) {
    Rol.sistemYoneticisi => [ozet, tesisler, karsilastirma, oneriler, kullanicilar],
    Rol.genelMudur => [ozet, tesisler, karsilastirma, oneriler],
    Rol.tesisMuduru || Rol.personel => [ozet, karsilastirma, oneriler],
  };
}

/// Giriş yapılan (ya da sistem yöneticisinin önizlediği) kullanıcının ana ekranı.
class AnaSayfa extends StatefulWidget {
  const AnaSayfa({super.key});

  @override
  State<AnaSayfa> createState() => _AnaSayfaState();
}

class _AnaSayfaState extends State<AnaSayfa> {
  int sekme = 0;

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final k = durum.gorunen;
    final yayin = durum.yayin;
    if (k == null || yayin == null) return const Scaffold();
    final sekmeler = _sekmeler(k.rol);
    // Önizleme sırasında alttaki ekranın sekme sayısı değişebilir; seçim korunur.
    final secili = sekme < sekmeler.length ? sekme : 0;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(sekmeler[secili].ad),
            Text('Son yayın: ${_tarih(yayin.olusturma)}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF9AA49F))),
          ],
        ),
        actions: [
          durum.yukleniyor
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                      width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                )
              : IconButton(tooltip: 'Yenile', icon: const Icon(Icons.refresh), onPressed: durum.yenile),
        ],
      ),
      drawer: _Menu(kullanici: k, onizleme: durum.onizleme),
      body: Column(
        children: [
          if (durum.onizleme) _OnizlemeSeridi(k),
          if (!durum.yukleniyor && (durum.hata != null || durum.kaynak == VeriKaynagi.ornek)) _DurumSeridi(durum),
          if (k.rol == Rol.personel && !durum.onizleme) const _PersonelSeridi(),
          Expanded(child: IndexedStack(index: secili, children: [for (final s in sekmeler) s.ekran])),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: secili,
        onDestinationSelected: (i) => setState(() => sekme = i),
        destinations: [for (final s in sekmeler) NavigationDestination(icon: Icon(s.ikon), label: s.ad)],
      ),
    );
  }

  static String _tarih(DateTime t) {
    String iki(int n) => n.toString().padLeft(2, '0');
    return '${iki(t.day)}.${iki(t.month)}.${t.year} ${iki(t.hour)}:${iki(t.minute)}';
  }
}

/// Soldan açılan menü: kullanıcı bilgisi, yenileme, hakkında ve çıkış.
class _Menu extends StatelessWidget {
  const _Menu({required this.kullanici, required this.onizleme});

  final Kullanici kullanici;
  final bool onizleme;

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    return Drawer(
      shape: const RoundedRectangleBorder(),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            color: grafit,
            padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RolAvatari(kullanici, yaricap: 24),
                const SizedBox(height: 12),
                Text(kullanici.adSoyad,
                    style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600)),
                Text(kullanici.eposta, style: const TextStyle(color: Color(0xFF9AA49F), fontSize: 13)),
                const SizedBox(height: 8),
                Text(kullanici.rol.ad, style: const TextStyle(color: Color(0xFF9FD0B4), fontSize: 13)),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.refresh),
            title: const Text('Verileri yenile'),
            onTap: () {
              Navigator.pop(context);
              durum.yenile();
            },
          ),
          if (kullanici.rol == Rol.personel)
            ListTile(
              leading: const Icon(Icons.edit_note),
              title: const Text('Veri girişi'),
              subtitle: const Text('Web uygulamasından yapılır'),
              onTap: () => _bilgi(
                  context,
                  'Veri girişi',
                  'Atandığınız tesislerin aylık verilerini web uygulamasından girin:\n\nsimaykrt.github.io/karbon-ayak-izi\n\n'
                      'Girdiğiniz veriler yayınlandığında bu uygulamada görünür.'),
            ),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Hakkında'),
            onTap: () => _bilgi(
                context,
                'Karbon Ayak İzi',
                'Tesislerin sera gazı emisyonlarını izlemek için mobil uygulama.\n\n'
                    'Veri girişi ve kullanıcı yönetimi web uygulamasında yapılır; bu uygulama yayınlanan sonuçları gösterir.'),
          ),
          const Spacer(),
          const Divider(height: 1),
          ListTile(
            leading: Icon(onizleme ? Icons.close : Icons.logout),
            title: Text(onizleme ? 'Önizlemeyi kapat' : 'Çıkış yap'),
            onTap: () async {
              final gezgin = Navigator.of(context);
              gezgin.pop(); // menüyü kapat
              if (onizleme) {
                gezgin.pop(); // önizlenen ekrandan sistem yöneticisinin ekranına dön
                return;
              }
              await durum.cikisYap();
              gezgin.pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const GirisEkrani()), (_) => false);
            },
          ),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
        ],
      ),
    );
  }

  void _bilgi(BuildContext context, String baslik, String metin) {
    Navigator.pop(context);
    showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(baslik),
        content: SelectableText(metin),
        actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('Tamam'))],
      ),
    );
  }
}

class _OnizlemeSeridi extends StatelessWidget {
  const _OnizlemeSeridi(this.kullanici);

  final Kullanici kullanici;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFEAF0F5),
      padding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
      child: Row(
        children: [
          Expanded(
            child: Text('Önizleme: ${kullanici.adSoyad} (${kullanici.rol.ad})',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Kapat')),
        ],
      ),
    );
  }
}

class _PersonelSeridi extends StatelessWidget {
  const _PersonelSeridi();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: acikYesil,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: const Text('Veri girişi web uygulamasından yapılır. Menüden adresine ulaşabilirsiniz.',
          style: TextStyle(fontSize: 12)),
    );
  }
}

class _DurumSeridi extends StatelessWidget {
  const _DurumSeridi(this.durum);

  final UygulamaDurumu durum;

  @override
  Widget build(BuildContext context) {
    final metin = durum.kaynak == VeriKaynagi.ornek
        ? 'İnternete bağlanılamadı; uygulamayla gelen örnek veriler gösteriliyor.'
        : 'İnternete bağlanılamadı; en son indirilen veriler gösteriliyor.';
    return Container(
      width: double.infinity,
      color: const Color(0xFFFBF3DF),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(metin, style: const TextStyle(fontSize: 12)),
    );
  }
}
