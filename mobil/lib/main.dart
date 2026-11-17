import 'package:flutter/material.dart';

import 'bilesenler/ortak.dart';
import 'ekranlar/ana_sayfa.dart';
import 'ekranlar/giris_ekrani.dart';
import 'veri/durum.dart';

void main() {
  runApp(KarbonMobil(durum: UygulamaDurumu()));
}

class KarbonMobil extends StatelessWidget {
  const KarbonMobil({super.key, required this.durum});

  final UygulamaDurumu durum;

  @override
  Widget build(BuildContext context) {
    final renkler = ColorScheme.fromSeed(seedColor: anaRenk, surface: Colors.white).copyWith(primary: anaRenk);
    return DurumKapsami(
      durum: durum,
      child: MaterialApp(
        title: 'Karbon Ayak İzi',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: renkler,
          scaffoldBackgroundColor: zemin,
          appBarTheme: const AppBarTheme(
            backgroundColor: grafit,
            foregroundColor: Color(0xFFE9ECE8),
            elevation: 0,
            scrolledUnderElevation: 0,
            titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Color(0xFFE9ECE8)),
          ),
          cardTheme: CardThemeData(
            elevation: 0,
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6), side: const BorderSide(color: cizgi)),
          ),
          navigationBarTheme: NavigationBarThemeData(
            backgroundColor: Colors.white,
            indicatorColor: acikYesil,
            height: 64,
            labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12)),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(4)),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: anaRenk,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
            ),
          ),
          chipTheme: ChipThemeData(
            selectedColor: acikYesil,
            side: const BorderSide(color: cizgi),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          ),
          dividerTheme: const DividerThemeData(color: cizgi),
        ),
        home: Baslangic(durum: durum),
      ),
    );
  }
}

/// Açılışta verileri ve kayıtlı oturumu yükler; ardından giriş ya da ana sayfayı açar.
class Baslangic extends StatefulWidget {
  const Baslangic({super.key, required this.durum});

  final UygulamaDurumu durum;

  @override
  State<Baslangic> createState() => _BaslangicState();
}

class _BaslangicState extends State<Baslangic> {
  late final Future<void> _hazirlik = widget.durum.baslat();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _hazirlik,
      builder: (context, durumu) {
        if (durumu.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: Logo(boyut: 56)));
        }
        if (durumu.hasError) {
          return Scaffold(
            body: Center(
                child: Padding(padding: const EdgeInsets.all(24), child: Text('Uygulama açılamadı: ${durumu.error}'))),
          );
        }
        return widget.durum.oturum != null ? const AnaSayfa() : const GirisEkrani();
      },
    );
  }
}
