/// Kullanıcılar ve roller. Hesaplar web uygulamasında yönetilir ve yayın
/// dosyasıyla gelir; şifreler SHA-256 özeti olarak tutulur.
library;

import 'dart:convert';

import 'package:crypto/crypto.dart';

enum Rol {
  sistemYoneticisi('sistem_yoneticisi', 'Sistem yöneticisi'),
  genelMudur('genel_mudur', 'Genel müdür'),
  tesisMuduru('tesis_muduru', 'Tesis müdürü'),
  personel('personel', 'Personel');

  const Rol(this.anahtar, this.ad);

  /// Yayın dosyasındaki adı
  final String anahtar;
  final String ad;

  static Rol? anahtardan(String a) => Rol.values.where((r) => r.anahtar == a).firstOrNull;

  /// Tüm tesisleri görebilen roller
  bool get tumTesisler => this == sistemYoneticisi || this == genelMudur;
}

class Kullanici {
  const Kullanici({
    required this.id,
    required this.adSoyad,
    required this.eposta,
    required this.rol,
    required this.tesisler,
    required this.aktif,
    required this.sifreOzeti,
  });

  factory Kullanici.fromJson(Map<String, dynamic> j) => Kullanici(
        id: j['id'] as String,
        adSoyad: j['adSoyad'] as String,
        eposta: j['eposta'] as String,
        rol: Rol.anahtardan(j['rol'] as String) ?? Rol.personel,
        tesisler: ((j['tesisler'] as List?) ?? []).cast<String>(),
        aktif: j['aktif'] as bool? ?? true,
        sifreOzeti: j['sifreOzeti'] as String? ?? '',
      );

  final String id;
  final String adSoyad;
  final String eposta;
  final Rol rol;

  /// Atanan tesislerin kimlikleri (tesis müdürü ve personel için)
  final List<String> tesisler;
  final bool aktif;
  final String sifreOzeti;

  /// Ad soyadın baş harfleri, ör. "AY"
  String get basHarfler => adSoyad.split(' ').where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();
}

/// SHA-256(karbon-ayak-izi|eposta|şifre). Web uygulaması da aynı yöntemi kullanır.
String sifreOzeti(String eposta, String sifre) =>
    sha256.convert(utf8.encode('karbon-ayak-izi|${eposta.trim().toLowerCase()}|$sifre')).toString();

/// Giriş denemesi: başarılıysa kullanıcıyı, değilse hata mesajını döner.
({Kullanici? kullanici, String? hata}) girisDogrula(List<Kullanici> liste, String eposta, String sifre) {
  final e = eposta.trim().toLowerCase();
  final k = liste.where((x) => x.eposta.toLowerCase() == e).firstOrNull;
  if (k == null || k.sifreOzeti != sifreOzeti(eposta, sifre)) {
    return (kullanici: null, hata: 'E-posta veya şifre hatalı.');
  }
  if (!k.aktif) return (kullanici: null, hata: 'Bu hesap pasif durumda. Sistem yöneticisine başvurun.');
  return (kullanici: k, hata: null);
}

/// Yayın dosyasında kullanıcı listesi yoksa kullanılan hesaplar (web ile aynı).
const varsayilanKullanicilar = [
  Kullanici(
      id: 'k_yonetici',
      adSoyad: 'Deniz Aydın',
      eposta: 'yonetici@karbon.com',
      rol: Rol.sistemYoneticisi,
      tesisler: [],
      aktif: true,
      sifreOzeti: 'd29c6b2000acc6f5b4bcf05bb1b089476c48b1dda69817c129e43a9f5b4a6080'),
  Kullanici(
      id: 'k_genelmudur',
      adSoyad: 'Ayşe Yılmaz',
      eposta: 'genelmudur@karbon.com',
      rol: Rol.genelMudur,
      tesisler: [],
      aktif: true,
      sifreOzeti: 'f049411170f08c36cb0f670bddeecc90a168f5439e9845c93632e20b23a09efe'),
  Kullanici(
      id: 'k_gebze',
      adSoyad: 'Mehmet Kaya',
      eposta: 'gebze.mudur@karbon.com',
      rol: Rol.tesisMuduru,
      tesisler: ['demo_fabrika'],
      aktif: true,
      sifreOzeti: '8b002b0944771e4022d78fb6449ea518b390589bfcc3421945839258506c5a4c'),
  Kullanici(
      id: 'k_antalya',
      adSoyad: 'Selin Koç',
      eposta: 'antalya.mudur@karbon.com',
      rol: Rol.tesisMuduru,
      tesisler: ['demo_otel'],
      aktif: true,
      sifreOzeti: '1be2aeeed5628a429097c0641d1743ce467c8a9b76deb94c37e9c73306958a95'),
  Kullanici(
      id: 'k_marmara',
      adSoyad: 'Can Öztürk',
      eposta: 'personel.marmara@karbon.com',
      rol: Rol.personel,
      tesisler: ['demo_fabrika', 'demo_tekstil', 'demo_ofis'],
      aktif: true,
      sifreOzeti: 'ba4f2744088f1e8db01774b6a7e9b24e6098efa25f97c30270fff887741895a7'),
  Kullanici(
      id: 'k_ege',
      adSoyad: 'Elif Şahin',
      eposta: 'personel.ege@karbon.com',
      rol: Rol.personel,
      tesisler: ['demo_depo', 'demo_otel'],
      aktif: true,
      sifreOzeti: '6413e8937ed25ccf1228cd483b7d2073bfc94f41ce70882eca1e7d4dead7e023'),
  Kullanici(
      id: 'k_anadolu',
      adSoyad: 'Burak Çelik',
      eposta: 'personel.anadolu@karbon.com',
      rol: Rol.personel,
      tesisler: ['demo_gida', 'demo_lojistik', 'demo_ankara'],
      aktif: true,
      sifreOzeti: '6419b60291b03e3b2cf1fee5b12147e20830b0bb80fd4693c7aceb3e41a56d07'),
];
