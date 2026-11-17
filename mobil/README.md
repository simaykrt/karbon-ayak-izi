# Karbon Ayak İzi – Mobil

Şirketin karbon ayak izinin telefondan takip edildiği Flutter uygulaması. Kullanıcı giriş yapar, rolüne göre farklı ekranlar açılır.

Sistem iki parçadan oluşur:

| Parça | Kim kullanır | Ne yapar |
|---|---|---|
| **Web uygulaması** ([simaykrt.github.io/karbon-ayak-izi](https://simaykrt.github.io/karbon-ayak-izi/)) | Personel ve sistem yöneticisi | Personel atandığı tesislerin aylık verilerini girer; sistem yöneticisi kullanıcıları ve tesisleri yönetir, sonuçları yayınlar |
| **Mobil uygulama** (bu klasör) | Yöneticiler ve personel | Yayınlanan sonuçları ve kullanıcı hesaplarını okur; rolüne göre özet, karşılaştırma ve önerileri gösterir. Veri girişi yapmaz. |

```
Personel (web) ──veri girer──▶ Sistem yöneticisi (web) ──"Yayın dosyasını oluştur"──▶ veri/yayin.json (GitHub) ──indirir──▶ Mobil uygulama
```

## Roller ve ekranlar

| Rol | Sekmeler | Gördüğü tesisler |
|---|---|---|
| **Sistem yöneticisi** | Özet, Tesisler, Karşılaştırma, Öneriler, Kullanıcılar | Tümü |
| **Genel müdür** | Özet, Tesisler, Karşılaştırma, Öneriler | Tümü |
| **Tesis müdürü** | Özet, Karşılaştırma, Öneriler | Yalnızca kendi tesisi |
| **Personel** | Özet, Karşılaştırma, Öneriler | Atandığı tesisler |

- **Giriş:** E-posta, şifre ve "Beni hatırla". Hesaplar web uygulamasında tanımlanır ve yayın dosyasıyla gelir.
- **Özet:** Toplam emisyon, geçen yıla göre değişim, çalışan başına emisyon, kapsamlara göre dağılım, aylık grafik, en büyük 5 kaynak ve azaltım hedefi durumu.
- **Tesisler:** Tesislerin ızgara görünümü; karta dokununca tesisin detay sayfası açılır.
- **Karşılaştırma:** Yıllık (bu yıl ve geçen yıl), aylık (önceki ay ve geçen yılın aynı ayı) ve tesisler arası karşılaştırma.
- **Öneriler:** Web uygulamasının ürettiği uyarılar ve azaltım önerileri.
- **Kullanıcılar:** Sistem yöneticisi kullanıcıları arar ve role göre süzer. Bir kullanıcıya dokunup **Bu kullanıcının ekranlarını aç** derse o kullanıcının gördüğü ekranlar önizleme olarak açılır.
- **Yan menü:** Kullanıcı bilgisi, verileri yenileme, hakkında ve çıkış.

Ekran aşağı çekilince veriler yenilenir. İnternet yoksa en son indirilen veriler, hiç indirilmemişse uygulamayla gelen örnek veriler gösterilir.

Demo hesaplar ve şifreleri için depo kökündeki [README.md](../README.md) dosyasına bakın.

## Çalıştırma

**Android:** GitHub'da **Actions → Mobil uygulama (APK)** sayfasındaki son başarılı çalışmanın altında `karbon-ayak-izi-apk` dosyası bulunur. İndirilen zip'in içindeki `app-release.apk` dosyası telefona kurulur. Kurulumda "bilinmeyen kaynaklara izin ver" seçeneğini açmak gerekebilir.

**iPhone (kurulumsuz):** Uygulamanın web sürümü https://simaykrt.github.io/karbon-ayak-izi/mobil-web/ adresinde. Safari'de açıp **Paylaş → Ana Ekrana Ekle** denince telefonda kendi simgesiyle, tam ekran açılır. Mobil kod değişince bu sürüm depo kökünde `bash scripts/mobil-web-derle.sh` ile yeniden üretilir.

**iPhone (gerçek iOS uygulaması):** iOS uygulaması yalnızca Mac'te derlenebilir:
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
  main.dart                       Tema ve açılış (FutureBuilder ile veri ve oturum yükleme)
  veri/
    model.dart                    yayin.json dosyasının veri modeli
    kullanici.dart                Roller, kullanıcı modeli, şifre özeti ve giriş kontrolü
    ozet.dart                     Yıllık toplamlar, karşılaştırmalar, hedef hesabı
    durum.dart                    Veri, oturum, görünen tesisler, tesis/yıl seçimi
  ekranlar/
    giris_ekrani.dart             Giriş formu
    ana_sayfa.dart                Rolüne göre sekmeler, yan menü, önizleme şeridi
    ozet_ekrani.dart
    tesisler_ekrani.dart          Tesis ızgarası
    tesis_detay_ekrani.dart       Tek tesisin özeti
    karsilastirma_ekrani.dart
    oneriler_ekrani.dart
    kullanicilar_ekrani.dart      Sistem yöneticisi: kullanıcı listesi ve önizleme
  bilesenler/
    ortak.dart                    Renkler, sayı biçimi, logo, seçiciler, ortak küçük bileşenler
assets/ornek_yayin.json           İnternet yokken gösterilen örnek veri
test/                             Birim ve arayüz testleri
```

Her dosyanın ayrıntılı açıklaması için [KOD_REHBERI.md](KOD_REHBERI.md) dosyasına bakın.
