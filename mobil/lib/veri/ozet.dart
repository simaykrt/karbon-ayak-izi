/// Yayın verisinden yıllık özetler ve karşılaştırmalar üretir.
library;

import 'model.dart';

const aylar = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];
const kisaAylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

String ayAnahtari(int yil, int ay) => '$yil-${ay.toString().padLeft(2, '0')}';

/// Bir veya birden fazla ayın toplamı (kg CO2e).
class Toplam {
  double toplam = 0;
  final List<double> kapsamlar = [0, 0, 0];
  final Map<String, double> kaynaklar = {};
  bool veriVar = false;

  void ekle(AySonucu a) {
    veriVar = true;
    toplam += a.toplam;
    for (var i = 0; i < 3; i++) {
      kapsamlar[i] += a.kapsamlar[i];
    }
    a.kaynaklar.forEach((k, v) => kaynaklar[k] = (kaynaklar[k] ?? 0) + v);
  }

  void topla(Toplam diger) {
    if (!diger.veriVar) return;
    veriVar = true;
    toplam += diger.toplam;
    for (var i = 0; i < 3; i++) {
      kapsamlar[i] += diger.kapsamlar[i];
    }
    diger.kaynaklar.forEach((k, v) => kaynaklar[k] = (kaynaklar[k] ?? 0) + v);
  }

  /// Emisyonu en yüksek kaynaklar, büyükten küçüğe
  List<MapEntry<String, double>> get siraliKaynaklar =>
      kaynaklar.entries.where((e) => e.value > 0).toList()..sort((a, b) => b.value.compareTo(a.value));
}

class YilOzeti {
  YilOzeti(this.yil, this.aylar, this.toplam);

  final int yil;
  final List<Toplam> aylar;
  final Toplam toplam;

  int get veriliAySayisi => aylar.where((a) => a.veriVar).length;
}

/// Seçili tesislerin bir yıldaki aylık ve yıllık toplamları.
YilOzeti yilOzeti(List<Tesis> tesisler, int yil) {
  final aylik = List.generate(12, (_) => Toplam());
  final toplam = Toplam();
  for (var ay = 1; ay <= 12; ay++) {
    for (final t in tesisler) {
      final sonuc = t.aylar[ayAnahtari(yil, ay)];
      if (sonuc != null) aylik[ay - 1].ekle(sonuc);
    }
    toplam.topla(aylik[ay - 1]);
  }
  return YilOzeti(yil, aylik, toplam);
}

/// Yüzde değişim; önceki değer 0 ise null.
double? yuzdeDegisim(double simdiki, double onceki) => onceki == 0 ? null : (simdiki - onceki) / onceki * 100;

/// İki yılı yalnızca ikisinde de verisi olan aylar üzerinden karşılaştırır,
/// böylece henüz bitmemiş bir yıl tam bir yılla haksız şekilde kıyaslanmaz.
({double simdiki, double onceki, int ortakAy, double? yuzde}) ayniAylarKarsilastir(YilOzeti a, YilOzeti b) {
  var x = 0.0, y = 0.0, n = 0;
  for (var i = 0; i < 12; i++) {
    if (a.aylar[i].veriVar && b.aylar[i].veriVar) {
      x += a.aylar[i].toplam;
      y += b.aylar[i].toplam;
      n++;
    }
  }
  return (simdiki: x, onceki: y, ortakAy: n, yuzde: yuzdeDegisim(x, y));
}

/// Azaltım hedefinin seçili yıldaki durumu. Baz yılı verisi eksikse null döner.
({double baz, double hedefDeger, double beklenen, double yillikMevcut, double gerceklesen, bool yolunda})? hedefDurumu(
    Tesis tesis, int yil) {
  final h = tesis.hedef;
  if (h == null || h.hedefYili <= h.bazYili) return null;
  final baz = yilOzeti([tesis], h.bazYili);
  final mevcut = yilOzeti([tesis], yil);
  if (baz.veriliAySayisi < 12 || mevcut.veriliAySayisi == 0) return null;
  final hedefDeger = baz.toplam.toplam * (1 - h.yuzde / 100);
  final ilerleme = ((yil - h.bazYili) / (h.hedefYili - h.bazYili)).clamp(0.0, 1.0);
  final beklenen = baz.toplam.toplam - (baz.toplam.toplam - hedefDeger) * ilerleme;
  // Eksik aylar varsa yıl sonuna ölçekle
  final yillik = mevcut.toplam.toplam * 12 / mevcut.veriliAySayisi;
  return (
    baz: baz.toplam.toplam,
    hedefDeger: hedefDeger,
    beklenen: beklenen,
    yillikMevcut: yillik,
    gerceklesen: (baz.toplam.toplam - yillik) / baz.toplam.toplam * 100,
    yolunda: yillik <= beklenen,
  );
}
