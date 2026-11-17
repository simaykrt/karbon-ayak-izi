# Kod Rehberi

Bu rehber mobil uygulamanın nasıl çalıştığını dosya dosya anlatır. Sonunda ders notundaki konuların uygulamada nerede kullanıldığı ve sunumda sorulabilecek sorular var.

## 1. Genel mimari

Mobil uygulama **sadece okuma** yapar. Veri girişi, hesaplamalar ve kullanıcı yönetimi web uygulamasında yapılır. Sonuçlar ve kullanıcı hesapları `yayin.json` dosyasına yazılır ve GitHub Pages üzerinden yayınlanır. Mobil uygulama bu dosyayı indirir, kullanıcıyı giriş yaptırır ve rolüne göre ekranları gösterir.

Bu ayrımın nedeni: Gerçek şirketlerde veri girişini ve kontrolü yetkili personel yapar, yöneticiler sonuçları izler. Hesaplama tek yerde (webde) yapıldığı için iki uygulama her zaman aynı sonucu gösterir.

Uygulamanın katmanları:

```
Ekranlar (ekranlar/)            →  Kullanıcının gördüğü arayüz
Durum (veri/durum.dart)         →  Veriyi indirir, saklar; oturumu ve görünen tesisleri tutar
Özetleme (veri/ozet.dart)       →  Toplamlar ve karşılaştırmalar (saf Dart, Flutter'a bağımlı değil)
Model (veri/model.dart,         →  JSON → Dart nesneleri, roller ve kullanıcılar
       veri/kullanici.dart)
```

### Roller

| Rol | Sekmeler | Gördüğü tesisler |
|---|---|---|
| Sistem yöneticisi | Özet, Tesisler, Karşılaştırma, Öneriler, Kullanıcılar | Tümü |
| Genel müdür | Özet, Tesisler, Karşılaştırma, Öneriler | Tümü |
| Tesis müdürü | Özet, Karşılaştırma, Öneriler | Kendi tesisi |
| Personel | Özet, Karşılaştırma, Öneriler | Atandığı tesisler |

## 2. Dosyalar

### `lib/veri/kullanici.dart` – Roller ve kullanıcılar
- `Rol` bir **enum**'dur ve her değerin alanları vardır: yayın dosyasındaki adı (`anahtar`) ve ekranda görünen adı (`ad`). `tumTesisler` getter'ı, rolün bütün tesisleri görüp göremeyeceğini söyler.
- `Kullanici` sınıfının alanları `final`'dır ve constructor'ı `const`'tur; `fromJson` factory constructor'ı JSON'dan nesne üretir.
- `sifreOzeti()`: Şifre açık metin olarak saklanmaz. `karbon-ayak-izi|eposta|şifre` metninin SHA-256 özeti (`crypto` paketi) tutulur. Web uygulaması aynı yöntemi kullandığı için iki tarafta aynı hesaplarla giriş yapılır.
- `girisDogrula()`: E-posta ve şifreyi kontrol eder; hesap pasifse girişe izin vermez. Dönüş tipi bir **record**: `(kullanici:, hata:)`.
- `varsayilanKullanicilar`: Yayın dosyasında kullanıcı listesi yoksa kullanılan demo hesaplar.

### `lib/veri/model.dart` – Veri modeli
`yayin.json` dosyasındaki her yapının bir Dart sınıfı var: `Yayin`, `Tesis`, `AySonucu`, `Oneri`, `Hedef`, `KaynakBilgisi`. Her sınıfta bir `fromJson` **factory constructor** bulunur; JSON'dan gelen `Map<String, dynamic>` değerini tipli bir nesneye çevirir. `Yayin.kullanicilar` web uygulamasında tanımlanan kullanıcıları taşır.

### `lib/veri/ozet.dart` – Özetleme
- `Toplam`: bir veya birden çok ayın emisyonlarını toplayan sınıf.
- `yilOzeti(tesisler, yil)`: verilen tesislerin 12 aylık dökümünü ve yıl toplamını hesaplar.
- `ayniAylarKarsilastir(a, b)`: İki yılı **sadece ikisinde de verisi olan aylar** üzerinden karşılaştırır; bitmemiş bir yıl tam yılla haksız şekilde kıyaslanmaz.
- `hedefDurumu(tesis, yil)`: Baz yılından hedef yılına doğrusal bir azalma çizgisi varsayar ve yıl sonu tahminini bu çizgiyle karşılaştırır.

### `lib/veri/durum.dart` – Uygulama durumu
- `UygulamaDurumu`, `ChangeNotifier` sınıfından türer. Veri, oturum ya da seçim değişince `notifyListeners()` çağrılır ve ekranlar yeniden çizilir.
- `oturum`: giriş yapan kullanıcı. `gorunen`: ekranları gösterilen kullanıcı. İkisi normalde aynıdır; sistem yöneticisi başka bir kullanıcının ekranlarını önizlerken `gorunen` o kullanıcı olur.
- `gorunurTesisler`: görünen kullanıcının rolüne göre görebileceği tesisler. Bütün ekranlar tesis listesini buradan alır; böylece bir personel başka tesislerin verisini hiçbir ekranda göremez.
- **Açılış** (`baslat`): telefonda kayıtlı son veri (yoksa uygulamayla gelen örnek veri) yüklenir, "Beni hatırla" ile kaydedilmiş oturum geri getirilir, internetten güncelleme arka planda başlar.
- `girisYap` / `cikisYap`: "Beni hatırla" seçiliyse kullanıcı kimliği `shared_preferences` ile telefonda saklanır.
- `DurumKapsami`, bir `InheritedNotifier`'dır; her ekran `DurumKapsami.of(context)` ile durumu okur.

### `lib/main.dart` – Başlangıç
- Uygulamanın teması burada: koyu grafit üst çubuk, ince çizgili beyaz kartlar, yeşil ana renk (web uygulamasıyla aynı).
- `Baslangic` ekranı açılışta **FutureBuilder** kullanır: veri ve oturum yüklenirken logo gösterilir; yükleme bitince oturum varsa ana sayfa, yoksa giriş ekranı açılır.

### `lib/ekranlar/giris_ekrani.dart`
`Form` ve iki `TextFormField` (e-posta ve şifre) kullanır; `validator` boş ya da hatalı alanları işaretler. Şifre alanındaki göz düğmesi `obscureText` değerini değiştirir. "Beni hatırla" bir `Checkbox`'tır. Giriş sürerken düğmede yükleme göstergesi görünür (`async`/`await`). Başarılı girişte `Navigator.pushReplacement` ile ana sayfa açılır; geri tuşu giriş ekranına dönmez.

### `lib/ekranlar/ana_sayfa.dart`
- `_sekmeler(rol)` fonksiyonu, rolüne göre hangi sekmelerin açılacağını bir `switch` ifadesiyle belirler.
- `Scaffold`'un `drawer` parametresiyle soldan açılan menü: kullanıcı bilgisi, verileri yenileme, hakkında ve çıkış. Çıkışta `Navigator.pushAndRemoveUntil` ile giriş ekranına dönülür ve geri tuşu ana sayfaya dönmez.
- Ekranlar `IndexedStack` içinde tutulur; sekme değiştirince ekranlar silinmez, seçimler korunur.
- Önizlemede üstte mavi bir şerit, personelde veri girişinin webden yapıldığını hatırlatan yeşil bir şerit, internet yoksa sarı bir şerit çıkar.

### `lib/ekranlar/tesisler_ekrani.dart` ve `tesis_detay_ekrani.dart`
Tesisler `GridView.builder` ile ızgara şeklinde dizilir; her kartta tür simgesi, şehir, yıllık emisyon ve geçen yıla göre değişim var. Karta dokununca `Navigator.push` ile tesis detay sayfası açılır. Detay sayfası Özet ekranını o tesis için yeniden kullanır (`OzetEkrani(sabitTesis: tesis)`).

### `lib/ekranlar/kullanicilar_ekrani.dart`
Yalnızca sistem yöneticisi görür. Üstte arama için bir `TextField`, altında role göre süzmek için `ChoiceChip`'ler, ardından `ListView.separated` ile kullanıcı listesi. Bir kullanıcıya dokununca `showModalBottomSheet` ile ayrıntı açılır. **Bu kullanıcının ekranlarını aç** düğmesi görünen kullanıcıyı değiştirir ve ana sayfayı o kullanıcı gibi açar; geri dönülünce yönetici kendi ekranına döner.

### `lib/ekranlar/ozet_ekrani.dart`
İki gösterge kartı (toplam emisyon ve çalışan başına), kapsam çubukları, `fl_chart` ile **yığılmış sütun grafik**, en büyük 5 kaynak ve hedef kartı. `RefreshIndicator` ile aşağı çekince veri yenilenir.

### `lib/ekranlar/karsilastirma_ekrani.dart`
`SegmentedButton` ile Yıllık, Aylık ve Tesisler görünümleri arasında geçilir. Seçili görünüm ve ay `StatefulWidget`'ın kendi state'inde tutulur.

### `lib/ekranlar/oneriler_ekrani.dart`
Uyarılar ve azaltım önerileri ayrı başlıklarda, `ExpansionTile` kartlarla gösterilir. Birden fazla tesise atanmış kullanıcı kendi tesislerinin önerilerini görür.

### `lib/bilesenler/ortak.dart`
Renk sabitleri, Türkçe sayı biçimi (`12.345,6`), artış/azalış etiketi, logo, rol renkli kullanıcı avatarı ve tesis/yıl seçicisi. Tek tesisi olan kullanıcıya seçici yerine tesis adı gösterilir.

### Testler (`test/`)
- `ozet_test.dart`: yayın dosyasının okunması, yıllık toplamlar, karşılaştırma, hedef hesabı, sayı biçimi.
- `kullanici_test.dart`: şifre özetinin web ile aynı olması, demo hesaplarla giriş, yanlış şifre, rollere göre görünen tesisler ve giriş ekranından başlayan bir arayüz testi (yanlış şifre hatası, genel müdürün Tesisler sekmesini görmesi, tesis müdürünün görmemesi).

## 3. Ders notundaki konular uygulamada nerede?

| Konu | Nerede |
|---|---|
| Cross-platform, PWA | Aynı kod Android (APK), iOS ve web (`mobil-web/`, ana ekrana eklenebilir) |
| `String?`, `??`, List, Map | `model.dart`, `durum.dart` (ör. `liste.isEmpty ? varsayilan : liste`, `?? const []`) |
| Class, constructor, `required`, `final`/`const` | `Kullanici`, `Tesis`, `Oneri` sınıfları |
| JSON'dan nesne oluşturan constructor | `Tesis.fromJson`, `Kullanici.fromJson` |
| `extends`, `@override` | Bütün ekranlar (`StatelessWidget`/`StatefulWidget`), `UygulamaDurumu extends ChangeNotifier` |
| StatelessWidget / StatefulWidget, `setState` | `OzetEkrani` (stateless), `GirisEkrani`, `KarsilastirmaEkrani` (stateful) |
| Scaffold: `appBar`, `drawer`, `bottomNavigationBar` | `ana_sayfa.dart` |
| Column, Row, Stack | Tüm ekranlar; `IndexedStack` ana sayfada |
| ListView, GridView | Kullanıcılar listesi, Tesisler ızgarası |
| TextField, Checkbox, ElevatedButton | Giriş ekranı, kullanıcı arama |
| Navigator | Giriş → ana sayfa, tesis → detay, kullanıcı → önizleme, çıkış |
| async/await, Future, http | `durum.dart` (`baslat`, `yenile`, `girisYap`) |
| FutureBuilder | `main.dart` açılış ekranı |

## 4. Emisyon nasıl hesaplanıyor? (web tarafı)

```
Emisyon (kg CO2e) = Faaliyet verisi × Emisyon faktörü
```
Örnek: 1.000 kWh şebeke elektriği × 0,442 = 442 kg CO2e.

Kaynaklar GHG Protokolü'ne göre üç kapsama ayrılır:
- **Kapsam 1:** Doğrudan emisyonlar (doğal gaz, araç yakıtı, soğutucu gaz kaçağı)
- **Kapsam 2:** Satın alınan enerji (elektrik, ısı)
- **Kapsam 3:** Diğer dolaylı emisyonlar (su, atık, iş seyahati, nakliye)

## 5. Sunumda sorulabilecek sorular

**Neden mobil uygulamada veri girişi yok?**
Veri girişi ve kontrol personelin işi; yöneticiler takip eder. Hesaplama tek yerde yapılınca iki uygulamanın farklı sonuç vermesi de engellenir.

**Kullanıcılar nerede tanımlanıyor, mobil nasıl biliyor?**
Sistem yöneticisi kullanıcıları web uygulamasındaki Kullanıcılar sayfasından ekler. Yayın dosyası oluşturulurken kullanıcılar da (şifre özetleriyle) dosyaya yazılır; mobil uygulama aynı dosyadan okur.

**Bu giriş sistemi güvenli mi?**
Şifreler açık metin değil, SHA-256 özeti olarak saklanıyor. Ama uygulamanın sunucusu olmadığı için kontrol telefonda yapılıyor; bu yüzden gerçek bir güvenlik sağlamaz, ekranları rollere ayırmak için kullanılıyor. Gerçek kullanımda sunucu taraflı kimlik doğrulama (ör. Firebase Authentication) gerekir.

**Sistem yöneticisi diğer rollerin ekranlarını nasıl görüyor?**
Kullanıcılar ekranında bir kullanıcıyı seçip "Bu kullanıcının ekranlarını aç" deyince durumdaki `gorunen` kullanıcı değişir; ana sayfa o kullanıcının rolüne ve tesislerine göre çizilir. Geri dönünce `gorunen` tekrar yöneticinin kendisi olur.

**İnternet olmazsa ne olur?**
Son indirilen veri `shared_preferences` ile telefonda saklanır ve gösterilir. Uygulama hiç internete bağlanmadıysa `assets` içindeki örnek veri kullanılır. Her iki durumda da sarı uyarı şeridi çıkar.

**State management olarak ne kullandınız?**
Flutter'ın kendi `ChangeNotifier` ve `InheritedNotifier` sınıflarını kullandık. Uygulama küçük olduğu için Provider gibi ek bir pakete gerek olmadı.

**Hangi paketleri kullandınız?**
`fl_chart` (grafikler), `http` (dosyayı indirme), `shared_preferences` (telefonda saklama), `crypto` (şifre özeti).

**iPhone'da çalışır mı?**
Evet. Flutter aynı koddan Android ve iOS uygulaması üretir; `ios` klasörü projede hazır. iOS derlemesi sadece Mac'te Xcode ile yapılabilir. Web sürümü ise Safari'de doğrudan açılır.
