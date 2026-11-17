/// Ekranlarda ortak kullanılan renkler, sayı biçimleri ve küçük bileşenler.
library;

import 'package:flutter/material.dart';

import '../veri/durum.dart';
import '../veri/kullanici.dart';

const anaRenk = Color(0xFF2F6B4F);
const grafit = Color(0xFF1F2528);
const zemin = Color(0xFFF3F5F2);
const cizgi = Color(0xFFD9DDD7);
const soluk = Color(0xFF5D6862);
const acikYesil = Color(0xFFE3EEE7);
const kapsamRenkleri = [Color(0xFFB85A3E), Color(0xFFC7962C), Color(0xFF4C7196)];
const kapsamAdlari = ['Kapsam 1', 'Kapsam 2', 'Kapsam 3'];
const iyiRenk = Color(0xFF2F6B4F);
const kotuRenk = Color(0xFFB23B2E);

/// Türkçe sayı biçimi: 12345.6 -> "12.345,6"
String sayi(double v, [int basamak = 0]) {
  final negatif = v < 0;
  final parcalar = v.abs().toStringAsFixed(basamak).split('.');
  final tam = parcalar[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
  final sonuc = parcalar.length > 1 ? '$tam,${parcalar[1]}' : tam;
  return negatif ? '-$sonuc' : sonuc;
}

/// kg CO2e -> ton gösterimi
String ton(double kg, [int basamak = 1]) => sayi(kg / 1000, basamak);

/// Değişim yüzdesi: artış kırmızı (kötü), azalış yeşil (iyi)
class DegisimEtiketi extends StatelessWidget {
  const DegisimEtiketi(this.yuzde, {super.key, this.boyut = 13});

  final double? yuzde;
  final double boyut;

  @override
  Widget build(BuildContext context) {
    final y = yuzde;
    if (y == null) return Text('—', style: TextStyle(fontSize: boyut));
    final renk = y > 0 ? kotuRenk : iyiRenk;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(y > 0 ? Icons.arrow_drop_up : Icons.arrow_drop_down, color: renk, size: boyut + 8),
        Text('%${sayi(y.abs(), 1)}', style: TextStyle(color: renk, fontWeight: FontWeight.w600, fontSize: boyut)),
      ],
    );
  }
}

/// Başlıklı içerik bloğu
class Bolum extends StatelessWidget {
  const Bolum({super.key, required this.baslik, required this.child, this.sag});

  final String baslik;
  final Widget child;
  final Widget? sag;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(baslik, style: Theme.of(context).textTheme.titleSmall)),
                if (sag != null) sag!,
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

/// Ekranların üstündeki tesis ve yıl seçicisi
class SeciciSerit extends StatelessWidget {
  const SeciciSerit({super.key, this.tesisGoster = true});

  /// Tesis detay sayfasında tesis zaten belli olduğu için yalnızca yıl seçilir.
  final bool tesisGoster;

  @override
  Widget build(BuildContext context) {
    final durum = DurumKapsami.of(context);
    final yayin = durum.yayin!;
    final tesisler = durum.gorunurTesisler;
    const kenar = InputDecoration(labelText: 'Tesis', isDense: true, border: OutlineInputBorder());
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          if (tesisGoster)
            Expanded(
              // Tek tesisi olan kullanıcı için seçim yapılmaz, tesis adı gösterilir.
              child: tesisler.length == 1
                  ? InputDecorator(decoration: kenar, child: Text(tesisler.first.ad, overflow: TextOverflow.ellipsis))
                  : DropdownButtonFormField<String?>(
                      key: ValueKey('tesis-${durum.gorunen?.id}-${durum.seciliTesisId}'),
                      initialValue: durum.seciliTesisId,
                      isExpanded: true,
                      decoration: kenar,
                      items: [
                        DropdownMenuItem<String?>(
                          value: null,
                          child: Text(durum.gorunen!.rol.tumTesisler ? 'Tüm tesisler' : 'Atanan tüm tesisler'),
                        ),
                        for (final t in tesisler)
                          DropdownMenuItem<String?>(value: t.id, child: Text(t.ad, overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: durum.tesisSec,
                    ),
            ),
          if (tesisGoster) const SizedBox(width: 12),
          SizedBox(
            width: 120,
            child: DropdownButtonFormField<int>(
              key: ValueKey('yil-${durum.yil}'),
              initialValue: durum.yil,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Yıl', isDense: true, border: OutlineInputBorder()),
              items: [for (final y in yayin.yillar) DropdownMenuItem(value: y, child: Text('$y'))],
              onChanged: (y) => durum.yilSec(y!),
            ),
          ),
        ],
      ),
    );
  }
}

Color rolRengi(Rol rol) => switch (rol) {
      Rol.sistemYoneticisi => grafit,
      Rol.genelMudur => anaRenk,
      Rol.tesisMuduru => kapsamRenkleri[2],
      Rol.personel => kapsamRenkleri[1],
    };

/// Kullanıcının baş harfleri, rol rengiyle
class RolAvatari extends StatelessWidget {
  const RolAvatari(this.kullanici, {super.key, this.yaricap = 20});

  final Kullanici kullanici;
  final double yaricap;

  @override
  Widget build(BuildContext context) {
    final renk = kullanici.aktif ? rolRengi(kullanici.rol) : soluk;
    return CircleAvatar(
      radius: yaricap,
      backgroundColor: renk == grafit ? const Color(0xFF3A4246) : renk,
      child: Text(kullanici.basHarfler,
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: yaricap * 0.7)),
    );
  }
}

/// Web uygulamasıyla aynı logo: koyu kare içinde azalan üç çubuk.
class Logo extends StatelessWidget {
  const Logo({super.key, this.boyut = 32, this.renk = grafit});

  final double boyut;
  final Color renk;

  @override
  Widget build(BuildContext context) {
    final b = boyut / 32;
    Widget cubuk(double h, double opaklik) => Container(
          width: 4 * b,
          height: h * b,
          margin: EdgeInsets.symmetric(horizontal: 1 * b),
          color: Colors.white.withValues(alpha: opaklik),
        );
    return Container(
      width: boyut,
      height: boyut,
      padding: EdgeInsets.only(bottom: 8 * b),
      decoration: BoxDecoration(color: renk, borderRadius: BorderRadius.circular(6 * b)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [cubuk(15, 1), cubuk(10, 0.75), cubuk(6, 0.5)],
      ),
    );
  }
}

/// Veri yokken gösterilen bilgi
class BosDurum extends StatelessWidget {
  const BosDurum(this.mesaj, {super.key});

  final String mesaj;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(child: Text(mesaj, textAlign: TextAlign.center)),
    );
  }
}
