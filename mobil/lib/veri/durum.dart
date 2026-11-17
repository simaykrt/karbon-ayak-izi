/// Uygulamanın verisi, oturum ve kullanıcının seçimleri (tesis, yıl).
///
/// Veri sırası: 1) internetteki yayın dosyası, 2) telefonda saklanan son
/// kopya, 3) uygulamayla gelen örnek dosya.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'kullanici.dart';
import 'model.dart';

/// Web uygulamasından yayınlanan dosyanın adresi (GitHub Pages).
const yayinAdresi = 'https://simaykrt.github.io/karbon-ayak-izi/veri/yayin.json';

const _onbellekAnahtari = 'son_yayin';
const _oturumAnahtari = 'oturum_kullanici';

enum VeriKaynagi { internet, onbellek, ornek }

class UygulamaDurumu extends ChangeNotifier {
  Yayin? yayin;
  VeriKaynagi? kaynak;
  bool yukleniyor = false;
  String? hata;

  /// Giriş yapan kullanıcı
  Kullanici? oturum;

  /// Ekranları görüntülenen kullanıcı. Normalde oturumdaki kullanıcıdır;
  /// sistem yöneticisi başka bir kullanıcının ekranlarını önizlerken o kullanıcıdır.
  Kullanici? gorunen;

  /// null: tüm (görülebilen) tesisler
  String? seciliTesisId;
  int? seciliYil;

  List<Kullanici> get kullanicilar {
    final liste = yayin?.kullanicilar ?? const [];
    return liste.isEmpty ? varsayilanKullanicilar : liste;
  }

  /// Görüntülenen kullanıcının görebildiği tesisler
  List<Tesis> get gorunurTesisler {
    final y = yayin;
    final k = gorunen;
    if (y == null || k == null) return [];
    if (k.rol.tumTesisler) return y.tesisler;
    return y.tesisler.where((t) => k.tesisler.contains(t.id)).toList();
  }

  List<Tesis> get seciliTesisler {
    final gorunur = gorunurTesisler;
    if (seciliTesisId == null) return gorunur;
    return gorunur.where((t) => t.id == seciliTesisId).toList();
  }

  Tesis? get seciliTesis {
    final gorunur = gorunurTesisler;
    if (gorunur.length == 1) return gorunur.first;
    return seciliTesisId == null ? null : seciliTesisler.firstOrNull;
  }

  int get yil => seciliYil ?? yayin?.raporYili ?? DateTime.now().year;

  bool get onizleme => gorunen != null && oturum != null && gorunen!.id != oturum!.id;

  void tesisSec(String? id) {
    seciliTesisId = id;
    notifyListeners();
  }

  void yilSec(int yil) {
    seciliYil = yil;
    notifyListeners();
  }

  /// Ekranları verilen kullanıcıya göre ayarlar (giriş, önizleme ya da önizlemeden dönüş).
  void gorunenAyarla(Kullanici? k) {
    gorunen = k;
    seciliTesisId = null;
    notifyListeners();
  }

  /// Uygulama açılışı: kayıtlı/örnek veriyi yükler, "beni hatırla" ile kalan
  /// oturumu geri getirir. İnternetten güncelleme arka planda sürer.
  Future<void> baslat() async {
    final prefs = await SharedPreferences.getInstance();
    final kayitli = prefs.getString(_onbellekAnahtari);
    if (kayitli != null) {
      _uygula(kayitli, VeriKaynagi.onbellek);
    } else {
      _uygula(await rootBundle.loadString('assets/ornek_yayin.json'), VeriKaynagi.ornek);
    }
    final id = prefs.getString(_oturumAnahtari);
    final k = kullanicilar.where((x) => x.id == id && x.aktif).firstOrNull;
    if (k != null) {
      oturum = k;
      gorunen = k;
    }
    unawaited(yenile());
  }

  /// Hata varsa mesajını döner, başarılıysa null.
  Future<String?> girisYap(String eposta, String sifre, {required bool hatirla}) async {
    final sonuc = girisDogrula(kullanicilar, eposta, sifre);
    if (sonuc.kullanici == null) return sonuc.hata;
    oturum = sonuc.kullanici;
    final prefs = await SharedPreferences.getInstance();
    if (hatirla) {
      await prefs.setString(_oturumAnahtari, oturum!.id);
    } else {
      await prefs.remove(_oturumAnahtari);
    }
    gorunenAyarla(oturum);
    return null;
  }

  Future<void> cikisYap() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_oturumAnahtari);
    oturum = null;
    gorunenAyarla(null);
  }

  Future<void> yenile() async {
    yukleniyor = true;
    hata = null;
    notifyListeners();
    try {
      // Tarayıcı/CDN önbelleğine takılmamak için adrese zaman damgası eklenir.
      final adres = Uri.parse('$yayinAdresi?t=${DateTime.now().millisecondsSinceEpoch}');
      final cevap = await http.get(adres).timeout(const Duration(seconds: 15));
      if (cevap.statusCode != 200) throw Exception('Sunucu ${cevap.statusCode} döndürdü');
      final metin = utf8.decode(cevap.bodyBytes);
      _uygula(metin, VeriKaynagi.internet);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_onbellekAnahtari, metin);
    } catch (e) {
      hata = 'Güncel veriler alınamadı. İnternet bağlantınızı kontrol edin.';
      debugPrint('Yayın indirilemedi: $e');
    } finally {
      yukleniyor = false;
      notifyListeners();
    }
  }

  void _uygula(String metin, VeriKaynagi k) {
    final yeni = Yayin.fromJson(jsonDecode(metin) as Map<String, dynamic>);
    yayin = yeni;
    kaynak = k;
    // Kullanıcı bilgileri yeni yayında değiştiyse güncel hâli kullanılır.
    if (oturum != null) oturum = kullanicilar.where((x) => x.id == oturum!.id).firstOrNull ?? oturum;
    if (gorunen != null) gorunen = kullanicilar.where((x) => x.id == gorunen!.id).firstOrNull ?? gorunen;
    if (seciliTesisId != null && !gorunurTesisler.any((t) => t.id == seciliTesisId)) seciliTesisId = null;
    if (seciliYil != null && !yeni.yillar.contains(seciliYil)) seciliYil = null;
  }
}

/// Durumu widget ağacına taşır: DurumKapsami.of(context) ile erişilir.
class DurumKapsami extends InheritedNotifier<UygulamaDurumu> {
  const DurumKapsami({super.key, required UygulamaDurumu durum, required super.child}) : super(notifier: durum);

  static UygulamaDurumu of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<DurumKapsami>()!.notifier!;
}
