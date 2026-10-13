/// Uygulamanın verisi ve kullanıcının seçimleri (tesis, yıl).
///
/// Veri sırası: 1) internetteki yayın dosyası, 2) telefonda saklanan son
/// kopya, 3) uygulamayla gelen örnek dosya.
library;

import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'model.dart';

/// Web uygulamasından yayınlanan dosyanın adresi (GitHub Pages).
const yayinAdresi = 'https://simaykrt.github.io/karbon-ayak-izi/veri/yayin.json';

const _onbellekAnahtari = 'son_yayin';

enum VeriKaynagi { internet, onbellek, ornek }

class UygulamaDurumu extends ChangeNotifier {
  Yayin? yayin;
  VeriKaynagi? kaynak;
  bool yukleniyor = false;
  String? hata;

  /// null: tüm tesisler
  String? seciliTesisId;
  int? seciliYil;

  List<Tesis> get seciliTesisler {
    final y = yayin;
    if (y == null) return [];
    if (seciliTesisId == null) return y.tesisler;
    return y.tesisler.where((t) => t.id == seciliTesisId).toList();
  }

  Tesis? get seciliTesis => seciliTesisId == null ? null : seciliTesisler.firstOrNull;

  int get yil => seciliYil ?? yayin?.raporYili ?? DateTime.now().year;

  void tesisSec(String? id) {
    seciliTesisId = id;
    notifyListeners();
  }

  void yilSec(int yil) {
    seciliYil = yil;
    notifyListeners();
  }

  /// Önce kayıtlı/örnek veriyi hemen gösterir, ardından internetten günceller.
  Future<void> baslat() async {
    final prefs = await SharedPreferences.getInstance();
    final kayitli = prefs.getString(_onbellekAnahtari);
    if (kayitli != null) {
      _uygula(kayitli, VeriKaynagi.onbellek);
    } else {
      _uygula(await rootBundle.loadString('assets/ornek_yayin.json'), VeriKaynagi.ornek);
    }
    await yenile();
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
    if (seciliTesisId != null && !yeni.tesisler.any((t) => t.id == seciliTesisId)) seciliTesisId = null;
    if (seciliYil != null && !yeni.yillar.contains(seciliYil)) seciliYil = null;
  }
}

/// Durumu widget ağacına taşır: DurumKapsami.of(context) ile erişilir.
class DurumKapsami extends InheritedNotifier<UygulamaDurumu> {
  const DurumKapsami({super.key, required UygulamaDurumu durum, required super.child}) : super(notifier: durum);

  static UygulamaDurumu of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<DurumKapsami>()!.notifier!;
}
