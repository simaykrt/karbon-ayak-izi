/// Emisyon kaynakları ve emisyon faktörleri.
///
/// Faktör birimi: kg CO2e / birim. Değerler GHG Protocol yaklaşımı ve
/// DEFRA dönüşüm faktörleri esas alınarak yaklaşık olarak belirlenmiştir.
class Kaynak {
  const Kaynak(this.anahtar, this.ad, this.birim, this.kapsam, this.faktor);

  final String anahtar;
  final String ad;
  final String birim;

  /// 1: doğrudan, 2: satın alınan enerji, 3: diğer dolaylı
  final int kapsam;
  final double faktor;
}

const List<Kaynak> kaynaklar = [
  Kaynak('dogalgaz', 'Doğal gaz', 'm³', 1, 2.02),
  Kaynak('motorin', 'Motorin (araç, jeneratör)', 'L', 1, 2.68),
  Kaynak('benzin', 'Benzin (şirket araçları)', 'L', 1, 2.31),
  Kaynak('sogutucu', 'Soğutucu gaz kaçağı (R-410A)', 'kg', 1, 2088),
  Kaynak('elektrik', 'Şebeke elektriği', 'kWh', 2, 0.442),
  Kaynak('yesil_elektrik', 'Yenilenebilir elektrik', 'kWh', 2, 0),
  Kaynak('su', 'Şebeke suyu', 'm³', 3, 0.38),
  Kaynak('atik', 'Depolanan atık', 'kg', 3, 0.467),
  Kaynak('ucak', 'İş seyahati (uçak)', 'yolcu·km', 3, 0.19),
];

final Map<String, Kaynak> kaynakHaritasi = {for (final k in kaynaklar) k.anahtar: k};

const Map<int, String> kapsamAdlari = {
  1: 'Kapsam 1 · Doğrudan',
  2: 'Kapsam 2 · Enerji',
  3: 'Kapsam 3 · Diğer',
};

const List<String> aylar = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const List<String> kisaAylar = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

/// Kayıtlarda kullanılan ay anahtarı, ör. 2025-03
String ayAnahtari(int yil, int ay) => '$yil-${ay.toString().padLeft(2, '0')}';
