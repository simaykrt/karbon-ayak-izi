import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:karbon_mobil/main.dart';
import 'package:karbon_mobil/veri/durum.dart';
import 'package:karbon_mobil/veri/kullanici.dart';
import 'package:karbon_mobil/veri/model.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final yayin =
      Yayin.fromJson(jsonDecode(File('assets/ornek_yayin.json').readAsStringSync()) as Map<String, dynamic>);
  Kullanici bul(String eposta) => yayin.kullanicilar.firstWhere((k) => k.eposta == eposta);

  test('şifre özeti web uygulamasıyla aynıdır', () {
    // Aynı değer web tarafında tests/kullanicilar.test.js içinde de kontrol edilir.
    expect(sifreOzeti(' Yonetici@Karbon.com ', '123456'),
        'd29c6b2000acc6f5b4bcf05bb1b089476c48b1dda69817c129e43a9f5b4a6080');
  });

  test('yayın dosyasındaki kullanıcılar okunur ve giriş yapabilir', () {
    expect(yayin.kullanicilar, hasLength(7));
    for (final k in yayin.kullanicilar) {
      expect(girisDogrula(yayin.kullanicilar, k.eposta, '123456').kullanici?.id, k.id);
    }
    expect(girisDogrula(yayin.kullanicilar, 'yonetici@karbon.com', 'yanlis').hata, isNotNull);
  });

  test('varsayılan hesaplar yayın dosyasındakilerle aynıdır', () {
    for (final v in varsayilanKullanicilar) {
      expect(bul(v.eposta).sifreOzeti, v.sifreOzeti);
      expect(bul(v.eposta).rol, v.rol);
    }
  });

  group('rollere göre görünen tesisler', () {
    late UygulamaDurumu durum;
    setUp(() => durum = UygulamaDurumu()..yayin = yayin);

    test('genel müdür tüm tesisleri görür', () {
      durum.gorunenAyarla(bul('genelmudur@karbon.com'));
      expect(durum.gorunurTesisler, hasLength(8));
      expect(durum.seciliTesis, isNull);
    });

    test('tesis müdürü yalnızca kendi tesisini görür', () {
      durum.gorunenAyarla(bul('gebze.mudur@karbon.com'));
      expect(durum.gorunurTesisler.map((t) => t.id), ['demo_fabrika']);
      expect(durum.seciliTesis?.id, 'demo_fabrika');
    });

    test('personel atandığı tesisleri görür, başka tesis seçemez', () {
      durum.gorunenAyarla(bul('personel.ege@karbon.com'));
      expect(durum.gorunurTesisler.map((t) => t.id).toSet(), {'demo_depo', 'demo_otel'});
      durum.tesisSec('demo_fabrika');
      expect(durum.seciliTesisler, isEmpty);
    });
  });

  testWidgets('giriş yapan genel müdür Tesisler sekmesini, tesis müdürü görmez', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final durum = UygulamaDurumu();
    await tester.pumpWidget(KarbonMobil(durum: durum));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
    await tester.pumpAndSettle();

    expect(find.text('Giriş yap'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).at(0), 'genelmudur@karbon.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'yanlis');
    await tester.tap(find.byType(ElevatedButton));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 100)));
    await tester.pumpAndSettle();
    expect(find.text('E-posta veya şifre hatalı.'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(1), '123456');
    await tester.tap(find.byType(ElevatedButton));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 100)));
    await tester.pumpAndSettle();
    expect(durum.oturum?.rol, Rol.genelMudur);
    expect(find.widgetWithText(NavigationDestination, 'Tesisler'), findsOneWidget);
    expect(find.widgetWithText(NavigationDestination, 'Kullanıcılar'), findsNothing);

    durum.gorunenAyarla(bul('gebze.mudur@karbon.com'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(NavigationDestination, 'Tesisler'), findsNothing);
    expect(find.text('Gebze Üretim Tesisi'), findsWidgets);
  });
}
