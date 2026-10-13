/// Web uygulamasının ürettiği yayın dosyasının (yayin.json) veri modeli.
///
/// Tüm emisyon değerleri kg CO2e cinsindendir.
library;

double _sayi(dynamic v) => v is num ? v.toDouble() : 0;

class KaynakBilgisi {
  KaynakBilgisi({required this.ad, required this.kapsam, required this.birim});

  factory KaynakBilgisi.fromJson(Map<String, dynamic> j) =>
      KaynakBilgisi(ad: j['ad'] as String, kapsam: j['kapsam'] as int, birim: j['birim'] as String? ?? '');

  final String ad;
  final int kapsam;
  final String birim;
}

/// Bir tesisin bir aylık emisyon sonucu.
class AySonucu {
  AySonucu({required this.toplam, required this.kapsamlar, required this.kaynaklar, this.uretim = 0});

  factory AySonucu.fromJson(Map<String, dynamic> j) => AySonucu(
        toplam: _sayi(j['t']),
        kapsamlar: (j['k'] as List).map(_sayi).toList(),
        kaynaklar: (j['s'] as Map<String, dynamic>).map((k, v) => MapEntry(k, _sayi(v))),
        uretim: _sayi(j['u']),
      );

  final double toplam;

  /// [Kapsam 1, Kapsam 2, Kapsam 3]
  final List<double> kapsamlar;
  final Map<String, double> kaynaklar;
  final double uretim;
}

class Oneri {
  Oneri({
    required this.baslik,
    required this.metin,
    required this.kategori,
    required this.oncelik,
    required this.tur,
    this.potansiyel,
  });

  factory Oneri.fromJson(Map<String, dynamic> j) => Oneri(
        baslik: j['baslik'] as String,
        metin: j['metin'] as String,
        kategori: j['kategori'] as String? ?? '',
        oncelik: j['oncelik'] as String? ?? 'düşük',
        tur: j['tur'] as String? ?? 'info',
        potansiyel: j['potansiyel'] == null ? null : _sayi(j['potansiyel']),
      );

  final String baslik;
  final String metin;
  final String kategori;

  /// yüksek, orta veya düşük
  final String oncelik;

  /// action (eylem), warning (uyarı) veya info (bilgi)
  final String tur;

  /// Tahmini yıllık azaltım (kg CO2e), yalnızca eylem önerilerinde
  final double? potansiyel;
}

class Hedef {
  Hedef({required this.bazYili, required this.hedefYili, required this.yuzde});

  factory Hedef.fromJson(Map<String, dynamic> j) =>
      Hedef(bazYili: j['bazYili'] as int, hedefYili: j['hedefYili'] as int, yuzde: _sayi(j['yuzde']));

  final int bazYili;
  final int hedefYili;
  final double yuzde;
}

class Tesis {
  Tesis({
    required this.id,
    required this.ad,
    required this.tur,
    required this.sehir,
    required this.calisan,
    required this.aylar,
    required this.oneriler,
    this.hedef,
  });

  factory Tesis.fromJson(Map<String, dynamic> j) => Tesis(
        id: j['id'] as String,
        ad: j['ad'] as String,
        tur: j['tur'] as String? ?? '',
        sehir: j['sehir'] as String? ?? '',
        calisan: _sayi(j['calisan']).round(),
        hedef: j['hedef'] == null ? null : Hedef.fromJson(j['hedef'] as Map<String, dynamic>),
        aylar: (j['aylar'] as Map<String, dynamic>)
            .map((k, v) => MapEntry(k, AySonucu.fromJson(v as Map<String, dynamic>))),
        oneriler: (j['oneriler'] as List).map((o) => Oneri.fromJson(o as Map<String, dynamic>)).toList(),
      );

  final String id;
  final String ad;
  final String tur;
  final String sehir;
  final int calisan;
  final Hedef? hedef;

  /// Ay anahtarı (ör. 2025-03) -> o ayın sonucu
  final Map<String, AySonucu> aylar;
  final List<Oneri> oneriler;
}

class Yayin {
  Yayin({
    required this.olusturma,
    required this.raporYili,
    required this.kaynaklar,
    required this.tesisler,
    required this.genelOneriler,
  });

  factory Yayin.fromJson(Map<String, dynamic> j) => Yayin(
        olusturma: DateTime.parse(j['olusturma'] as String).toLocal(),
        raporYili: j['raporYili'] as int,
        kaynaklar: (j['kaynaklar'] as Map<String, dynamic>)
            .map((k, v) => MapEntry(k, KaynakBilgisi.fromJson(v as Map<String, dynamic>))),
        tesisler: (j['tesisler'] as List).map((t) => Tesis.fromJson(t as Map<String, dynamic>)).toList(),
        genelOneriler:
            ((j['genelOneriler'] as List?) ?? []).map((o) => Oneri.fromJson(o as Map<String, dynamic>)).toList(),
      );

  final DateTime olusturma;

  /// Önerilerin hesaplandığı yıl (verisi olan en son yıl)
  final int raporYili;
  final Map<String, KaynakBilgisi> kaynaklar;
  final List<Tesis> tesisler;

  /// Tüm tesisler birlikte değerlendirildiğinde çıkan öneriler
  final List<Oneri> genelOneriler;

  /// Verisi olan yıllar, yeniden eskiye
  List<int> get yillar {
    final s = <int>{};
    for (final t in tesisler) {
      for (final k in t.aylar.keys) {
        s.add(int.parse(k.substring(0, 4)));
      }
    }
    return s.toList()..sort((a, b) => b.compareTo(a));
  }
}
