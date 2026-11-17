import 'package:flutter/material.dart';

import '../bilesenler/ortak.dart';
import '../veri/durum.dart';
import 'ana_sayfa.dart';

/// E-posta ve şifreyle giriş. Başarılı girişte kullanıcının rolüne göre ana sayfa açılır.
class GirisEkrani extends StatefulWidget {
  const GirisEkrani({super.key});

  @override
  State<GirisEkrani> createState() => _GirisEkraniState();
}

class _GirisEkraniState extends State<GirisEkrani> {
  final _form = GlobalKey<FormState>();
  final _eposta = TextEditingController();
  final _sifre = TextEditingController();
  bool _sifreGizli = true;
  bool _hatirla = false;
  bool _bekliyor = false;
  String? _hata;

  @override
  void dispose() {
    _eposta.dispose();
    _sifre.dispose();
    super.dispose();
  }

  Future<void> _girisYap() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _bekliyor = true;
      _hata = null;
    });
    final durum = DurumKapsami.of(context);
    final hata = await durum.girisYap(_eposta.text, _sifre.text, hatirla: _hatirla);
    if (!mounted) return;
    if (hata != null) {
      setState(() {
        _bekliyor = false;
        _hata = hata;
      });
      return;
    }
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AnaSayfa()));
  }

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Align(alignment: Alignment.centerLeft, child: Logo(boyut: 44)),
                  const SizedBox(height: 16),
                  Text('Karbon Ayak İzi', style: tema.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const Text('Sera gazı envanteri takip uygulaması', style: TextStyle(color: soluk)),
                  const SizedBox(height: 28),
                  Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Form(
                        key: _form,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _eposta,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.username],
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(labelText: 'E-posta'),
                              validator: (v) => (v == null || !v.contains('@')) ? 'Geçerli bir e-posta girin' : null,
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _sifre,
                              obscureText: _sifreGizli,
                              autofillHints: const [AutofillHints.password],
                              onFieldSubmitted: (_) => _girisYap(),
                              decoration: InputDecoration(
                                labelText: 'Şifre',
                                suffixIcon: IconButton(
                                  tooltip: _sifreGizli ? 'Şifreyi göster' : 'Şifreyi gizle',
                                  icon: Icon(_sifreGizli ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                                  onPressed: () => setState(() => _sifreGizli = !_sifreGizli),
                                ),
                              ),
                              validator: (v) => (v == null || v.isEmpty) ? 'Şifrenizi girin' : null,
                            ),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () => setState(() => _hatirla = !_hatirla),
                              child: Row(
                                children: [
                                  Checkbox(value: _hatirla, onChanged: (v) => setState(() => _hatirla = v ?? false)),
                                  const Text('Beni hatırla'),
                                ],
                              ),
                            ),
                            if (_hata != null)
                              Container(
                                margin: const EdgeInsets.only(top: 6, bottom: 6),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9E6E3),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(_hata!, style: const TextStyle(color: kotuRenk)),
                              ),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: _bekliyor ? null : _girisYap,
                              child: _bekliyor
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Giriş yap'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
