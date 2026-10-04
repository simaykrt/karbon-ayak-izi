/*
 * Emisyon kaynakları ve varsayılan emisyon faktörleri.
 *
 * Faktörler kgCO2e / birim cinsindendir. Değerler GHG Protocol, IPCC AR5 GWP
 * değerleri ve DEFRA/DESNZ dönüşüm faktörleri esas alınarak yaklaşık olarak
 * belirlenmiştir. Resmî raporlamada kuruluşunuzun kullanması gereken güncel
 * ulusal faktörleri (ör. ETKB elektrik şebeke faktörü) "Emisyon Faktörleri"
 * sayfasından girebilirsiniz.
 */
(function (global) {
  const SCOPES = {
    1: { name: 'Kapsam 1', desc: 'Doğrudan emisyonlar (yakıt yanması, şirket araçları, kaçak gazlar)' },
    2: { name: 'Kapsam 2', desc: 'Satın alınan enerjiden kaynaklı dolaylı emisyonlar' },
    3: { name: 'Kapsam 3', desc: 'Değer zincirindeki diğer dolaylı emisyonlar' },
  };

  const SOURCES = [
    // Kapsam 1 – Sabit yanma
    { key: 'natural_gas', label: 'Doğal gaz', unit: 'm³', scope: 1, group: 'Sabit yanma', factor: 2.02 },
    { key: 'coal', label: 'Kömür', unit: 'ton', scope: 1, group: 'Sabit yanma', factor: 2403 },
    { key: 'fuel_oil', label: 'Fuel-oil', unit: 'L', scope: 1, group: 'Sabit yanma', factor: 3.17 },
    { key: 'lpg', label: 'LPG', unit: 'kg', scope: 1, group: 'Sabit yanma', factor: 2.94 },
    { key: 'diesel_stationary', label: 'Motorin (jeneratör / kazan)', unit: 'L', scope: 1, group: 'Sabit yanma', factor: 2.68 },
    // Kapsam 1 – Hareketli yanma
    { key: 'diesel_fleet', label: 'Motorin (şirket araçları)', unit: 'L', scope: 1, group: 'Hareketli yanma', factor: 2.68 },
    { key: 'gasoline_fleet', label: 'Benzin (şirket araçları)', unit: 'L', scope: 1, group: 'Hareketli yanma', factor: 2.31 },
    // Kapsam 1 – Kaçak emisyonlar (soğutucu gaz dolumları = kaçak miktarı)
    { key: 'ref_r410a', label: 'Soğutucu gaz R-410A (dolum/kaçak)', unit: 'kg', scope: 1, group: 'Kaçak emisyonlar', factor: 2088 },
    { key: 'ref_r134a', label: 'Soğutucu gaz R-134a (dolum/kaçak)', unit: 'kg', scope: 1, group: 'Kaçak emisyonlar', factor: 1430 },
    { key: 'ref_r404a', label: 'Soğutucu gaz R-404A (dolum/kaçak)', unit: 'kg', scope: 1, group: 'Kaçak emisyonlar', factor: 3922 },
    { key: 'ref_r32', label: 'Soğutucu gaz R-32 (dolum/kaçak)', unit: 'kg', scope: 1, group: 'Kaçak emisyonlar', factor: 675 },
    // Kapsam 2
    { key: 'electricity', label: 'Şebeke elektriği', unit: 'kWh', scope: 2, group: 'Satın alınan enerji', factor: 0.442 },
    { key: 'electricity_renewable', label: 'Yenilenebilir elektrik (YEK-G / I-REC / öz üretim GES)', unit: 'kWh', scope: 2, group: 'Satın alınan enerji', factor: 0 },
    { key: 'district_heat', label: 'Satın alınan ısı / buhar', unit: 'kWh', scope: 2, group: 'Satın alınan enerji', factor: 0.17 },
    // Kapsam 3
    { key: 'water', label: 'Şebeke suyu (temin + arıtma)', unit: 'm³', scope: 3, group: 'Su ve atık', factor: 0.38 },
    { key: 'waste_landfill', label: 'Atık – düzenli depolama', unit: 'kg', scope: 3, group: 'Su ve atık', factor: 0.467 },
    { key: 'waste_recycled', label: 'Atık – geri dönüşüm', unit: 'kg', scope: 3, group: 'Su ve atık', factor: 0.021 },
    { key: 'paper', label: 'Kâğıt tüketimi', unit: 'kg', scope: 3, group: 'Su ve atık', factor: 0.919 },
    { key: 'flight_domestic', label: 'İş seyahati – yurt içi uçuş', unit: 'yolcu·km', scope: 3, group: 'Seyahat ve ulaşım', factor: 0.246 },
    { key: 'flight_international', label: 'İş seyahati – yurt dışı uçuş', unit: 'yolcu·km', scope: 3, group: 'Seyahat ve ulaşım', factor: 0.19 },
    { key: 'business_car', label: 'İş seyahati – kiralık / özel araç', unit: 'km', scope: 3, group: 'Seyahat ve ulaşım', factor: 0.17 },
    { key: 'commute', label: 'Çalışan ulaşımı (servis, toplu taşıma)', unit: 'yolcu·km', scope: 3, group: 'Seyahat ve ulaşım', factor: 0.1 },
    { key: 'freight_road', label: 'Nakliye – karayolu', unit: 'ton·km', scope: 3, group: 'Lojistik', factor: 0.107 },
    { key: 'freight_sea', label: 'Nakliye – deniz yolu', unit: 'ton·km', scope: 3, group: 'Lojistik', factor: 0.016 },
  ];

  const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.key, s]));

  const FACILITY_TYPES = ['Fabrika', 'Şirket / Ofis', 'Depo / Lojistik', 'Mağaza', 'Hastane', 'Otel', 'Okul / Kampüs', 'Diğer'];

  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  const Factors = { SCOPES, SOURCES, SOURCE_MAP, FACILITY_TYPES, MONTHS, MONTHS_SHORT };

  if (typeof module === 'object' && module.exports) module.exports = Factors;
  else global.KAI = Object.assign(global.KAI || {}, { Factors });
})(typeof window !== 'undefined' ? window : globalThis);
