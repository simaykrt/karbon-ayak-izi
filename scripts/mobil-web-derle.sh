#!/usr/bin/env bash
# Flutter mobil uygulamasının web (iPhone/tarayıcı) sürümünü derler ve
# GitHub Pages'te yayınlanacak mobil-web/ klasörüne kopyalar.
# Kullanım: bash scripts/mobil-web-derle.sh
set -euo pipefail
kok="$(cd "$(dirname "$0")/.." && pwd)"
cd "$kok/mobil"
flutter build web --release --base-href /karbon-ayak-izi/mobil-web/
rm -rf "$kok/mobil-web"
cp -r build/web "$kok/mobil-web"
# Grafik motoru (CanvasKit) çalışırken Google'ın sunucusundan yüklenir; depoda tutulmaz.
rm -rf "$kok/mobil-web/canvaskit"
echo "mobil-web/ güncellendi"
