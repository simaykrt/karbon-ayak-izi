# 🌿 Karbon Ayak İzi

Karbon ayak izini hesaplamak zorunda olan şirket, fabrika ve diğer kurumlar için hazırlanmış bir web uygulaması. Uygulama emisyonları **aylık ve yıllık** olarak hesaplar, dönemleri ve tesisleri **karşılaştırır** ve emisyonları **azaltmak için öneriler** sunar.

Hesaplamalar **GHG Protocol** (Sera Gazı Protokolü) yaklaşımına göre **Kapsam 1, 2 ve 3** olarak ayrılır.

## Özellikler

| Sayfa | Ne yapar? |
|---|---|
| 📊 **Panel** | Yıllık toplam ve kapsam bazında emisyonlar, geçen yılla değişim, yoğunluk göstergeleri (çalışan başına, m² başına, birim üretim başına), azaltım hedefi ilerlemesi, aylık grafik, kaynaklara göre dağılım ve aylık döküm tablosu |
| 📝 **Veri Girişi** | Tesis bazında aylık tüketim verilerini girme (doğal gaz, elektrik, yakıtlar, soğutucu gazlar, su, atık, seyahat, lojistik…), anlık emisyon önizlemesi, önceki aydan kopyalama, CSV içe/dışa aktarma |
| ⚖️ **Karşılaştırma** | Yıl ↔ yıl (aylık grafik ve kaynak bazında fark), ay ↔ ay (önceki ay / geçen yılın aynı ayı) ve tesis ↔ tesis karşılaştırması |
| 💡 **Öneriler** | Emisyon dağılımına göre önceliklendirilmiş azaltım önerileri ve tahmini azaltım potansiyeli (tCO₂e); artış, olağan dışı aylar, eksik veri, hedeften sapma uyarıları; SKDM (CBAM) ve İklim Kanunu bilgilendirmeleri |
| 🏭 **Tesisler** | Birden fazla tesis (fabrika, ofis, depo…) tanımlama; çalışan sayısı, alan, üretim birimi ve azaltım hedefi (baz yılı, hedef yılı, %) |
| 📄 **Rapor** | Yazdırılabilir / PDF olarak kaydedilebilir yıllık sera gazı raporu ve CSV özet |
| ⚙️ **Faktörler ve Ayarlar** | Emisyon faktörlerini güncel resmî değerlerle değiştirme, JSON yedek alma/geri yükleme, örnek veri yükleme |

## Kullanım

Kurulum gerekmez.

1. `index.html` dosyasını tarayıcıda açın **veya** yerel sunucu başlatın:
   ```bash
   npm start          # python3 -m http.server 8080
   # http://localhost:8080 adresini açın
   ```
2. **Tesisler** sayfasından şirketinizi / fabrikanızı ekleyin (denemek için "Örnek veriyi yükle" butonunu kullanabilirsiniz).
3. **Veri Girişi** sayfasından her ayın faturalarındaki tüketim değerlerini girin.
4. **Panel**, **Karşılaştırma**, **Öneriler** ve **Rapor** sayfalarından sonuçları inceleyin.

> Veriler yalnızca kullandığınız tarayıcıda (localStorage) saklanır, hiçbir sunucuya gönderilmez. Düzenli olarak **Ayarlar → Yedek al (JSON)** ile yedek alın.

Grafikler için Chart.js internetten (cdnjs) yüklenir; internet yoksa uygulama tablolarla çalışmaya devam eder.

## Hesaplama yöntemi

```
Emisyon (kgCO₂e) = Faaliyet verisi × Emisyon faktörü
```

| Kapsam | Kaynaklar |
|---|---|
| **Kapsam 1** – doğrudan | Doğal gaz, kömür, fuel-oil, LPG, motorin (jeneratör/kazan), şirket araçlarının yakıtı, soğutucu gaz kaçakları (R-410A, R-134a, R-404A, R-32) |
| **Kapsam 2** – enerji dolaylı | Şebeke elektriği, yenilenebilir elektrik (YEK-G / I-REC / GES, faktör 0), satın alınan ısı/buhar |
| **Kapsam 3** – diğer dolaylı | Su, atık (depolama / geri dönüşüm), kâğıt, iş seyahatleri (uçak, araç), çalışan ulaşımı, karayolu ve deniz yolu nakliye |

- Varsayılan faktörler DEFRA/DESNZ dönüşüm faktörleri ve IPCC AR5 küresel ısınma potansiyelleri esas alınarak belirlenmiş **yaklaşık** değerlerdir. Resmî raporlamada (ör. Türkiye elektrik şebeke faktörü için ETKB'nin yayımladığı değer) güncel faktörleri **Faktörler ve Ayarlar** sayfasından girin.
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
js/app.js               Arayüz, sayfalar ve grafikler
tests/calc.test.js      Birim testleri
```

## Testler

```bash
npm test
```

Node.js 18+ gerektirir (ek bağımlılık yoktur).

## Lisans

MIT
