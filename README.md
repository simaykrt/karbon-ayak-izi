# Karbon Ayak İzi

Karbon ayak izini hesaplamak zorunda olan şirket, fabrika ve diğer kurumlar için hazırlanmış bir web uygulaması. Uygulama emisyonları **aylık ve yıllık** olarak hesaplar, dönemleri ve tesisleri **karşılaştırır** ve emisyonları **azaltmak için öneriler** sunar.

Hesaplamalar **GHG Protocol** (Sera Gazı Protokolü) yaklaşımına göre **Kapsam 1, 2 ve 3** olarak ayrılır.

**Uygulamayı açın:** https://simaykrt.github.io/karbon-ayak-izi/

## Özellikler

| Sayfa | Ne yapar? |
|---|---|
| **Panel** | Toplam emisyon, geçen yıla göre değişim, aylık grafik, en büyük kaynaklar; Yazdır düğmesi |
| **Veri Girişi** | Tesis bazında aylık tüketim verilerini girme (doğal gaz, elektrik, yakıtlar, soğutucu gazlar, su, atık, seyahat, lojistik…), anlık emisyon önizlemesi, önceki aydan kopyalama, CSV içe/dışa aktarma |
| **Karşılaştırma** | İki yılın aylık karşılaştırması ve tesislerin toplam emisyonları |
| **Öneriler** | En etkili 5 azaltım önerisi ve dikkat edilecek uyarılar |
| **Tesisler** | Birden fazla tesis (fabrika, ofis, depo…) tanımlama; çalışan sayısı, alan, üretim birimi ve azaltım hedefi (baz yılı, hedef yılı, %) |
| **Ayarlar** | Emisyon faktörlerini güncel resmî değerlerle değiştirme, JSON yedek alma/geri yükleme, örnek veri yükleme, mobil uygulama için yayın |
| **Kullanıcılar** | Sistem yöneticisi için kullanıcı ekleme, düzenleme, silme, pasife alma; rol ve tesis ataması |

## Kullanım

Kurulum gerekmez.

1. `index.html` dosyasını tarayıcıda açın **veya** yerel sunucu başlatın:
   ```bash
   npm start          # python3 -m http.server 8080
   # http://localhost:8080 adresini açın
   ```
2. Hesabınızla giriş yapın (demo hesaplar aşağıda).
3. Uygulama ilk açılışta sekiz örnek tesisin (Gebze metal fabrikası, Bursa tekstil fabrikası, Konya gıda fabrikası, İzmir soğuk hava deposu, Mersin lojistik merkezi, Antalya otel, İstanbul genel merkez, Ankara bölge ofisi) 2023'ten bugüne aylık verileriyle gelir. Sistem yöneticisi kendi verilerine başlamak için üstteki **Örnek verileri temizle** düğmesine basabilir.
4. Sistem yöneticisi **Tesisler** sayfasından tesisleri, **Kullanıcılar** sayfasından personeli ve yöneticileri tanımlar.
5. Personel **Veri Girişi** sayfasından atandığı tesislerin aylık fatura ve sayaç değerlerini girer.
6. **Panel**, **Karşılaştırma**, **Öneriler** sayfalarından sonuçlar incelenir; Panel'deki Yazdır düğmesiyle çıktı alınır.

> Veriler yalnızca kullandığınız tarayıcıda (localStorage) saklanır, hiçbir sunucuya gönderilmez. Düzenli olarak **Ayarlar → Yedek al (JSON)** ile yedek alın.

Grafikler için Chart.js internetten (cdnjs) yüklenir; internet yoksa uygulama tablolarla çalışmaya devam eder.

## Roller ve demo hesaplar

| Rol | Web | Mobil |
|---|---|---|
| **Sistem yöneticisi** | Tüm sayfalar, kullanıcı ve tesis yönetimi, yayın | Tüm ekranlar; her kullanıcının ekranlarını önizleme |
| **Personel** | Atandığı tesisler için veri girişi ve sonuçlar | Atandığı tesislerin sonuçları |
| **Genel müdür** | Tüm tesislerin sonuçları (salt okunur) | Tüm tesisler, tesis ızgarası ve detay sayfası |
| **Tesis müdürü** | Kendi tesisinin sonuçları (salt okunur) | Kendi tesisinin sonuçları |

Demo hesapların hepsinin şifresi `123456`:

| Rol | E-posta | Tesisler |
|---|---|---|
| Sistem yöneticisi | yonetici@karbon.com | Tümü |
| Genel müdür | genelmudur@karbon.com | Tümü |
| Tesis müdürü | gebze.mudur@karbon.com | Gebze Üretim Tesisi |
| Tesis müdürü | antalya.mudur@karbon.com | Antalya Sahil Oteli |
| Personel | personel.marmara@karbon.com | Gebze, Bursa, İstanbul |
| Personel | personel.ege@karbon.com | İzmir, Antalya |
| Personel | personel.anadolu@karbon.com | Konya, Mersin, Ankara |

Şifreler açık metin olarak değil, SHA-256 özeti olarak saklanır. Uygulamanın sunucusu olmadığı için bu giriş sistemi gerçek bir güvenlik sağlamaz; ekranları rollere göre ayırmak için kullanılır. Gerçek kullanımda sunucu taraflı kimlik doğrulama (ör. Firebase Authentication) gerekir.

## Mobil uygulama

Yöneticilerin verileri telefondan takip etmesi için bir Flutter uygulaması da var: [mobil/](mobil/). Veri girişi, kontroller ve kullanıcı yönetimi web uygulamasında yapılır; mobil uygulama sonuçları gösterir. Kullanıcı hesapları da yayın dosyasıyla mobile aktarılır, aynı hesaplarla giriş yapılır.

**iPhone'da veya herhangi bir telefonda açmak için:** https://simaykrt.github.io/karbon-ayak-izi/mobil-web/ (Safari'de **Paylaş → Ana Ekrana Ekle** ile uygulama gibi kullanılabilir). Android için APK dosyası GitHub Actions'ta üretilir.

Mobil uygulamayı güncellemek için:
1. Web uygulamasında **Faktörler ve Ayarlar → Mobil uygulama → Yayın dosyasını oluştur** düğmesine basın.
2. İnen `yayin.json` dosyasını GitHub'da [veri/](veri/) klasörüne yükleyin (**Add file → Upload files**).
3. 1-2 dakika sonra mobil uygulamada ekranı aşağı çekince yeni veriler görünür.

Ayrıntılar için [mobil/README.md](mobil/README.md) ve [mobil/KOD_REHBERI.md](mobil/KOD_REHBERI.md) dosyalarına bakın.

## Hesaplama yöntemi

```
Emisyon (kgCO₂e) = Faaliyet verisi × Emisyon faktörü
```

| Kapsam | Kaynaklar |
|---|---|
| **Kapsam 1** – doğrudan | Doğal gaz, kömür, fuel-oil, LPG, motorin (jeneratör/kazan), şirket araçlarının yakıtı, soğutucu gaz kaçakları (R-410A, R-134a, R-404A, R-32) |
| **Kapsam 2** – enerji dolaylı | Şebeke elektriği, yenilenebilir elektrik (YEK-G / I-REC / GES, faktör 0), satın alınan ısı/buhar |
| **Kapsam 3** – diğer dolaylı | Su, atık (depolama / geri dönüşüm), kâğıt, iş seyahatleri (uçak, araç), çalışan ulaşımı, karayolu ve deniz yolu nakliye |

- Varsayılan faktörler DEFRA/DESNZ dönüşüm faktörleri ve IPCC AR5 küresel ısınma potansiyelleri esas alınarak belirlenmiş **yaklaşık** değerlerdir. Resmî raporlamada (ör. Türkiye elektrik şebeke faktörü için ETKB'nin yayımladığı değer) güncel faktörleri **Ayarlar** sayfasından girin.
- Yıllar karşılaştırılırken yüzde değişim, **yalnızca her iki yılda da verisi olan aylar** üzerinden hesaplanır (eksik yıl yanıltıcı sonuç vermesin diye).
- Hedef takibi: baz yılı emisyonundan hedef yılına doğrusal azalma yörüngesi çizilir; içinde bulunulan yılın eksik ayları yıllığa ölçeklenerek karşılaştırılır.

## CSV formatı

Veri Girişi sayfasından şablon indirilebilir. Ayraç `;` (veya `,`), ilk sütun `ay` (`2025-01` biçiminde), diğer sütunlar kaynak anahtarları (`electricity`, `natural_gas`, `diesel_fleet` …), ardından `uretim` ve `not`.

## Proje yapısı

```
index.html              Uygulama sayfası
css/styles.css          Tasarım (açık/koyu tema, mobil uyumlu, yazdırma görünümü)
js/factors.js           Emisyon kaynakları, kapsamlar ve varsayılan faktörler
js/calc.js              Hesaplama motoru (aylık/yıllık toplamlar, karşılaştırma, yoğunluk, hedef)
js/recommendations.js   Azaltım önerileri motoru
js/storage.js           Kayıt (localStorage), CSV/JSON, örnek veri
js/kullanicilar.js      Roller, yetkiler, giriş ve kullanıcı kayıtları
js/yayin.js             Mobil uygulama için yayın dosyası (yayin.json)
veri/yayin.json         Mobil uygulamanın okuduğu yayınlanmış veriler
scripts/                Örnek verilerden yayin.json üretme betiği
mobil/                  Flutter mobil uygulaması
mobil-web/              Mobil uygulamanın tarayıcı/iPhone sürümü (scripts/mobil-web-derle.sh ile üretilir)
js/app.js               Arayüz, sayfalar ve grafikler
tests/                  Birim testleri (hesaplama, kullanıcılar ve yetkiler)
```

## Testler

```bash
npm test
```

Node.js 18+ gerektirir (ek bağımlılık yoktur).

## Lisans

MIT
