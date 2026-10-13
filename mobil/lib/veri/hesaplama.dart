import 'kaynaklar.dart';

/// Bir tesisin ayları: ay anahtarı -> (kaynak anahtarı -> faaliyet miktarı)
typedef TesisKayitlari = Map<String, Map<String, double>>;

/// Emisyon hesap sonucu (kg CO2e).
class Sonuc {
  final Map<String, double> kaynakBazinda = {};
  final Map<int, double> kapsamlar = {1: 0, 2: 0, 3: 0};
  double toplam = 0;
  bool veriVar = false;

  void ekle(Sonuc diger) {
    diger.kaynakBazinda.forEach((k, v) => kaynakBazinda[k] = (kaynakBazinda[k] ?? 0) + v);
    diger.kapsamlar.forEach((k, v) => kapsamlar[k] = kapsamlar[k]! + v);
    toplam += diger.toplam;
    veriVar = veriVar || diger.veriVar;
  }
}

/// Tek bir ayın faaliyet verisinden emisyonu hesaplar:
/// emisyon = faaliyet miktarı × emisyon faktörü
Sonuc ayHesapla(Map<String, double>? faaliyet) {
  final sonuc = Sonuc();
  if (faaliyet == null) return sonuc;
  sonuc.veriVar = true;
  for (final kaynak in kaynaklar) {
    final miktar = faaliyet[kaynak.anahtar] ?? 0;
    if (miktar <= 0) continue;
    final kg = miktar * kaynak.faktor;
    sonuc.kaynakBazinda[kaynak.anahtar] = kg;
    sonuc.kapsamlar[kaynak.kapsam] = sonuc.kapsamlar[kaynak.kapsam]! + kg;
    sonuc.toplam += kg;
  }
  return sonuc;
}

/// Bir yılın 12 aylık dökümü ve yıl toplamı.
class YilOzeti {
  YilOzeti(this.yil, this.aylar, this.toplam);

  final int yil;
  final List<Sonuc> aylar;
  final Sonuc toplam;

  int get veriliAySayisi => aylar.where((a) => a.veriVar).length;
}

/// Verilen tesislerin (bir veya hepsi) seçili yıldaki emisyonlarını toplar.
YilOzeti yilHesapla(List<TesisKayitlari> tesisler, int yil) {
  final aylik = <Sonuc>[];
  final toplam = Sonuc();
  for (var ay = 1; ay <= 12; ay++) {
    final ayToplami = Sonuc();
    for (final kayitlar in tesisler) {
      final faaliyet = kayitlar[ayAnahtari(yil, ay)];
      if (faaliyet != null) ayToplami.ekle(ayHesapla(faaliyet));
    }
    aylik.add(ayToplami);
    toplam.ekle(ayToplami);
  }
  return YilOzeti(yil, aylik, toplam);
}

/// Yüzde değişim; önceki değer 0 ise null döner.
double? yuzdeDegisim(double simdiki, double onceki) =>
    onceki == 0 ? null : (simdiki - onceki) / onceki * 100;

/// İki yılı yalnızca her ikisinde de verisi olan aylar üzerinden karşılaştırır.
/// Böylece henüz bitmemiş bir yıl, tam bir yılla haksız şekilde kıyaslanmaz.
({double simdiki, double onceki, int ortakAy, double? yuzde}) ayniAylarKarsilastir(
    YilOzeti simdiki, YilOzeti onceki) {
  var a = 0.0, b = 0.0, n = 0;
  for (var i = 0; i < 12; i++) {
    if (simdiki.aylar[i].veriVar && onceki.aylar[i].veriVar) {
      a += simdiki.aylar[i].toplam;
      b += onceki.aylar[i].toplam;
      n++;
    }
  }
  return (simdiki: a, onceki: b, ortakAy: n, yuzde: yuzdeDegisim(a, b));
}
