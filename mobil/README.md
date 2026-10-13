# Karbon Ayak İzi – Mobil

Yöneticilerin şirketin karbon ayak izini telefondan takip ettiği Flutter uygulaması.

Sistem iki parçadan oluşur:

| Parça | Kim kullanır | Ne yapar |
|---|---|---|
| **Web uygulaması** ([simaykrt.github.io/karbon-ayak-izi](https://simaykrt.github.io/karbon-ayak-izi/)) | Birimde çalışan personel | Aylık tüketim verilerini girer, emisyonları hesaplar, kontrolleri yapar, sonuçları yayınlar |
| **Mobil uygulama** (bu klasör) | Yöneticiler | Yayınlanan sonuçları okur; özet, karşılaştırma ve önerileri gösterir. Veri girişi yapmaz. |

```
Personel (web)  ──"Yayın dosyasını oluştur"──▶  veri/yayin.json (GitHub)  ──indirir──▶  Yönetici (mobil)
```

## Ekranlar

- **Özet:** Toplam emisyon, geçen yıla göre değişim, çalışan başına emisyon, kapsamlara göre dağılım, aylık grafik, en büyük 5 kaynak ve azaltım hedefi durumu
- **Karşılaştırma:** Yıllık (bu yıl ve geçen yıl), aylık (önceki ay ve geçen yılın aynı ayı) ve tesisler arası karşılaştırma
- **Öneriler:** Web uygulamasının ürettiği uyarılar ve azaltım önerileri

Üstteki seçicilerden tesis (veya tüm tesisler) ve yıl seçilir. Ekran aşağı çekilince veriler yenilenir. İnternet yoksa en son indirilen veriler, hiç indirilmemişse uygulamayla gelen örnek veriler gösterilir.

## Çalıştırma

**Android:** GitHub'da **Actions → Mobil uygulama (APK)** sayfasındaki son başarılı çalışmanın altında `karbon-ayak-izi-apk` dosyası bulunur. İndirilen zip'in içindeki `app-release.apk` dosyası telefona kurulur. Kurulumda "bilinmeyen kaynaklara izin ver" seçeneğini açmak gerekebilir.

**iPhone:** iOS uygulaması yalnızca Mac'te derlenebilir:
1. Mac'e [Flutter](https://docs.flutter.dev/get-started/install/macos) ve App Store'dan Xcode kurulur.
2. `mobil` klasöründe `open ios/Runner.xcworkspace` ile proje Xcode'da açılır. **Signing & Capabilities** bölümünde Apple kimliği seçilir.
3. iPhone kabloyla bağlanır ve `flutter run --release` çalıştırılır. Ücretsiz Apple kimliğiyle yüklenen uygulama 7 gün çalışır.

**Bilgisayarda deneme:** `flutter run -d chrome`

## Testler

```bash
flutter test
```

## Klasör yapısı

```
lib/
  main.dart                     Uygulamanın başlangıcı, alt menü ve üst çubuk
  veri/
    model.dart                  yayin.json dosyasının veri modeli
    ozet.dart                   Yıllık toplamlar, karşılaştırmalar, hedef hesabı
    durum.dart                  Verinin indirilmesi, saklanması, tesis/yıl seçimi
  ekranlar/
    ozet_ekrani.dart
    karsilastirma_ekrani.dart
    oneriler_ekrani.dart
  bilesenler/
    ortak.dart                  Renkler, sayı biçimi, ortak küçük bileşenler
assets/ornek_yayin.json         İnternet yokken gösterilen örnek veri
test/ozet_test.dart             Birim testleri
```

Her dosyanın ayrıntılı açıklaması için [KOD_REHBERI.md](KOD_REHBERI.md) dosyasına bakın.
