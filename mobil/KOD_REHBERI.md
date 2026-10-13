# Kod Rehberi

Bu rehber mobil uygulamanın nasıl çalıştığını dosya dosya anlatır. Sonunda sunumda sorulabilecek sorular ve cevapları var.

## 1. Genel mimari

Uygulama **sadece okuma** yapar. Hesaplamalar web uygulamasında yapılır, sonuçlar `yayin.json` dosyasına yazılır ve GitHub Pages üzerinden yayınlanır. Mobil uygulama bu dosyayı indirir, ekranda gösterilecek toplamları ve karşılaştırmaları üretir.

Bu ayrımın nedeni: Gerçek şirketlerde veri girişi ve kontrolü yetkili personel yapar, yöneticiler sonuçları izler. Hesaplama tek yerde (webde) yapıldığı için iki uygulama her zaman aynı sonucu gösterir.

Uygulamanın katmanları:

```
Ekranlar (ekranlar/)        →  Kullanıcının gördüğü arayüz
Durum (veri/durum.dart)     →  Veriyi indirir, saklar, seçili tesis/yılı tutar
Özetleme (veri/ozet.dart)   →  Toplamlar ve karşılaştırmalar (saf Dart, Flutter'a bağımlı değil)
Model (veri/model.dart)     →  JSON → Dart nesneleri
```

## 2. Dosyalar

### `lib/veri/model.dart` – Veri modeli
`yayin.json` dosyasındaki her yapının bir Dart sınıfı var: `Yayin`, `Tesis`, `AySonucu`, `Oneri`, `Hedef`, `KaynakBilgisi`.
Her sınıfta bir `fromJson` **factory constructor** bulunur; JSON'dan gelen `Map<String, dynamic>` değerini tipli bir nesneye çevirir.

- `AySonucu.kapsamlar` → `[Kapsam 1, Kapsam 2, Kapsam 3]` emisyonları (kg CO2e)
- `Tesis.aylar` → `"2026-03"` gibi ay anahtarından o ayın sonucuna giden bir `Map`
- `Yayin.yillar` → verisi olan yılları yeniden eskiye sıralayan bir **getter**

### `lib/veri/ozet.dart` – Özetleme
- `Toplam`: bir veya birden çok ayın emisyonlarını toplayan sınıf (`ekle`, `topla`).
- `yilOzeti(tesisler, yil)`: seçili tesislerin 12 aylık dökümünü ve yıl toplamını hesaplar. "Tüm tesisler" seçilince bütün tesisler, bir tesis seçilince sadece o tesis verilir.
- `ayniAylarKarsilastir(a, b)`: İki yılı **sadece ikisinde de verisi olan aylar** üzerinden karşılaştırır. 2026'da 9 ay veri varken 12 aylık 2025 ile kıyaslanırsa düşüş yanlış çıkar; bu fonksiyon bunu önler. Dönüş tipi bir Dart 3 **record**'udur: `(simdiki:, onceki:, ortakAy:, yuzde:)`.
- `hedefDurumu(tesis, yil)`: Baz yılından hedef yılına doğrusal bir azalma çizgisi varsayar. Seçili yılda olması gereken seviyeyi (beklenen) yıl sonu tahminiyle karşılaştırır.

### `lib/veri/durum.dart` – Uygulama durumu
- `UygulamaDurumu`, `ChangeNotifier` sınıfından türer. Veri ya da seçim değişince `notifyListeners()` çağrılır ve ekranlar yeniden çizilir.
- **Veriyi yükleme sırası** (`baslat` metodu):
  1. Telefonda kayıtlı son veri varsa (`shared_preferences`) hemen gösterilir.
  2. Yoksa uygulamayla gelen `assets/ornek_yayin.json` gösterilir.
  3. Ardından `yenile()` internetten güncel dosyayı indirir (`http` paketi). İndirme başarılı olursa veri gösterilir ve telefona kaydedilir.
- Adrese `?t=zaman` eklenmesinin nedeni, GitHub'ın ve tarayıcının eski dosyayı önbellekten vermesini engellemektir.
- `DurumKapsami`, bir `InheritedNotifier`'dır. Durumu widget ağacının tepesine koyar; her ekran `DurumKapsami.of(context)` ile durumu okur ve durum değişince otomatik yenilenir. Ek bir paket (Provider vb.) gerektirmeyen, Flutter'ın kendi yöntemidir.

### `lib/main.dart` – Başlangıç
- `main()` durumu oluşturur, `baslat()` ile veriyi yüklemeye başlar ve uygulamayı çalıştırır.
- `AnaSayfa`: üst çubuk (son yayın tarihi, bilgi ve yenile düğmeleri), alt menü (`NavigationBar`) ve üç ekran.
- Ekranlar `IndexedStack` içinde tutulur; sekme değiştirince ekranlar silinmez, seçimler ve kaydırma konumu korunur.
- İnternet yoksa sarı bir uyarı şeridi gösterilir.

### `lib/ekranlar/ozet_ekrani.dart`
İki gösterge kartı (toplam emisyon ve çalışan başına), kapsam çubukları, `fl_chart` ile **yığılmış sütun grafik** (her ay için Kapsam 1-2-3 üst üste), en büyük 5 kaynak ve hedef kartı. `RefreshIndicator` ekranı aşağı çekince veriyi yeniler.

### `lib/ekranlar/karsilastirma_ekrani.dart`
`SegmentedButton` ile üç görünüm arasında geçiş yapılır:
- **Yıllık:** iki yılın aylarını yan yana sütunlarla gösterir ve en çok değişen kaynakları listeler.
- **Aylık:** seçilen ayı bir önceki ayla ve geçen yılın aynı ayıyla bir `Table` içinde karşılaştırır.
- **Tesisler:** tesisleri emisyona göre sıralar.

Seçili görünüm ve ay yalnızca bu ekranı ilgilendirdiği için `StatefulWidget`'ın kendi state'inde tutulur.

### `lib/ekranlar/oneriler_ekrani.dart`
Uyarıları ve azaltım önerilerini ayrı başlıklar altında gösterir. Kartlar `ExpansionTile`'dır; dokununca açıklama açılır. Öncelik rengi `switch` ifadesiyle seçilir.

### `lib/bilesenler/ortak.dart`
- `sayi()`: Türkçe sayı biçimi (`12.345,6`). Düzenli ifade, her üç basamakta bir nokta ekler.
- `DegisimEtiketi`: artışı kırmızı yukarı ok, azalışı yeşil aşağı okla gösterir. Emisyonda artış kötü olduğu için renkler bilerek ters seçildi.
- `SeciciSerit`: tesis ve yıl seçicisi. Her ekranda aynıdır; seçim tüm ekranlara yansır.

### `test/ozet_test.dart`
Örnek yayın dosyasıyla şunları kontrol eder: dosyanın doğru okunması, yıllık toplamın aylar toplamına eşit olması, "tüm tesisler" toplamının tesislerin toplamına eşit olması, aynı aylar karşılaştırması, hedef hesabı ve Türkçe sayı biçimi.

## 3. Emisyon nasıl hesaplanıyor? (web tarafı)

```
Emisyon (kg CO2e) = Faaliyet verisi × Emisyon faktörü
```
Örnek: 1.000 kWh şebeke elektriği × 0,442 = 442 kg CO2e.

Kaynaklar GHG Protokolü'ne göre üç kapsama ayrılır:
- **Kapsam 1:** Doğrudan emisyonlar (doğal gaz, araç yakıtı, soğutucu gaz kaçağı)
- **Kapsam 2:** Satın alınan enerji (elektrik, ısı)
- **Kapsam 3:** Diğer dolaylı emisyonlar (su, atık, iş seyahati, nakliye)

## 4. Sunumda sorulabilecek sorular

**Neden mobil uygulamada veri girişi yok?**
Veri girişi ve kontrol birim personelinin işi; yöneticiler takip eder. Hesaplama tek yerde yapılınca iki uygulamanın farklı sonuç vermesi de engellenir.

**İnternet olmazsa ne olur?**
Son indirilen veri `shared_preferences` ile telefonda saklanır ve gösterilir. Uygulama hiç internete bağlanmadıysa `assets` içindeki örnek veri kullanılır. Her iki durumda da sarı uyarı şeridi çıkar.

**State management olarak ne kullandınız?**
Flutter'ın kendi `ChangeNotifier` ve `InheritedNotifier` sınıflarını kullandık. Uygulama küçük olduğu için ek paket gerekmedi.

**Hangi paketleri kullandınız?**
`fl_chart` (grafikler), `http` (dosyayı indirme), `shared_preferences` (telefonda saklama).

**Neden sadece aynı aylar karşılaştırılıyor?**
Yıl bitmeden yapılan karşılaştırmada eksik aylar düşüş gibi görünür. Sadece iki yılda da verisi olan aylar kıyaslanınca sonuç adil olur.

**iPhone'da çalışır mı?**
Evet. Flutter aynı koddan Android ve iOS uygulaması üretir; `ios` klasörü projede hazır. iOS derlemesi sadece Mac'te Xcode ile yapılabilir.
