import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:karbon_mobil/bilesenler/ortak.dart';
import 'package:karbon_mobil/veri/model.dart';
import 'package:karbon_mobil/veri/ozet.dart';

void main() {
  final yayin = Yayin.fromJson(jsonDecode(File('assets/ornek_yayin.json').readAsStringSync()) as Map<String, dynamic>);

  test('örnek yayın dosyası okunur', () {
    expect(yayin.tesisler, hasLength(4));
    expect(yayin.yillar.first, yayin.raporYili);
    expect(yayin.kaynaklar['electricity']!.kapsam, 2);
    expect(yayin.genelOneriler, isNotEmpty);
  });

  test('yıllık toplam, ayların ve kapsamların toplamına eşittir', () {
    final ozet = yilOzeti(yayin.tesisler, yayin.raporYili);
    final aylarToplami = ozet.aylar.fold<double>(0, (s, a) => s + a.toplam);
    expect(ozet.toplam.toplam, closeTo(aylarToplami, 0.01));
    final kapsamToplami = ozet.toplam.kapsamlar.reduce((a, b) => a + b);
    expect(kapsamToplami, closeTo(ozet.toplam.toplam, ozet.toplam.toplam * 0.0001));
  });

  test('tüm tesisler toplamı, tesislerin tek tek toplamına eşittir', () {
    final hepsi = yilOzeti(yayin.tesisler, yayin.raporYili).toplam.toplam;
    final tekTek = yayin.tesisler.fold<double>(0, (s, t) => s + yilOzeti([t], yayin.raporYili).toplam.toplam);
    expect(hepsi, closeTo(tekTek, 0.01));
  });

  test('aynı aylar karşılaştırması yalnızca ortak ayları kullanır', () {
    final a = yilOzeti(yayin.tesisler, yayin.raporYili);
    final b = yilOzeti(yayin.tesisler, yayin.raporYili - 1);
    final k = ayniAylarKarsilastir(a, b);
    expect(k.ortakAy, a.veriliAySayisi);
    expect(k.onceki, lessThan(b.toplam.toplam));
    expect(yuzdeDegisim(110, 100), closeTo(10, 1e-9));
    expect(yuzdeDegisim(5, 0), isNull);
  });

  test('hedef durumu hesaplanır', () {
    final fabrika = yayin.tesisler.firstWhere((t) => t.hedef != null);
    final h = hedefDurumu(fabrika, yayin.raporYili);
    expect(h, isNotNull);
    expect(h!.hedefDeger, closeTo(h.baz * (1 - fabrika.hedef!.yuzde / 100), 0.01));
  });

  test('Türkçe sayı biçimi', () {
    expect(sayi(1234567.891, 2), '1.234.567,89');
    expect(sayi(-950), '-950');
    expect(ton(12345.6), '12,3');
  });
}
