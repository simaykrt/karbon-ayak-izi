import 'package:flutter/material.dart';

import 'bilesenler/ortak.dart';
import 'ekranlar/karsilastirma_ekrani.dart';
import 'ekranlar/oneriler_ekrani.dart';
import 'ekranlar/ozet_ekrani.dart';
import 'veri/durum.dart';

void main() {
  final durum = UygulamaDurumu()..baslat();
  runApp(KarbonMobil(durum: durum));
}

class KarbonMobil extends StatelessWidget {
  const KarbonMobil({super.key, required this.durum});

  final UygulamaDurumu durum;

  @override
  Widget build(BuildContext context) {
    return DurumKapsami(
      durum: durum,
      child: MaterialApp(
        title: 'Karbon Ayak İzi',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorSchemeSeed: anaRenk,
          scaffoldBackgroundColor: const Color(0xFFF3F5F2),
          cardTheme: const CardThemeData(elevation: 0, color: Colors.white),
        ),
        home: const AnaSayfa(),
      ),
    );
  }
}

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
    final yayin = durum.yayin;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Karbon Ayak İzi'),
            if (yayin != null)
              Text('Son yayın: ${_tarih(yayin.olusturma)}', style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Bilgi',
            icon: const Icon(Icons.info_outline),
            onPressed: () => _bilgiGoster(context),
          ),
          durum.yukleniyor
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : IconButton(tooltip: 'Yenile', icon: const Icon(Icons.refresh), onPressed: durum.yenile),
        ],
      ),
      body: yayin == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (!durum.yukleniyor && (durum.hata != null || durum.kaynak == VeriKaynagi.ornek)) _DurumSeridi(durum),
                Expanded(
                  child: IndexedStack(
                    index: sekme,
                    children: const [OzetEkrani(), KarsilastirmaEkrani(), OnerilerEkrani()],
                  ),
                ),
              ],
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: sekme,
        onDestinationSelected: (i) => setState(() => sekme = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights), label: 'Özet'),
          NavigationDestination(icon: Icon(Icons.compare_arrows), label: 'Karşılaştırma'),
          NavigationDestination(
              icon: Icon(Icons.lightbulb_outline), selectedIcon: Icon(Icons.lightbulb), label: 'Öneriler'),
        ],
      ),
    );
  }

  static String _tarih(DateTime t) {
    String iki(int n) => n.toString().padLeft(2, '0');
    return '${iki(t.day)}.${iki(t.month)}.${t.year} ${iki(t.hour)}:${iki(t.minute)}';
  }

  void _bilgiGoster(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Bu uygulama hakkında'),
        content: const Text(
          'Karbon Ayak İzi mobil uygulaması yöneticilerin emisyonları takip etmesi içindir.\n\n'
          'Veri girişi ve kontroller birim personeli tarafından web uygulamasında yapılır. '
          'Personel verileri yayınladığında bu uygulama güncel sonuçları otomatik olarak alır; '
          'ekranı aşağı çekerek de yenileyebilirsiniz.\n\n'
          'Web uygulaması: simaykrt.github.io/karbon-ayak-izi',
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Tamam'))],
      ),
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
