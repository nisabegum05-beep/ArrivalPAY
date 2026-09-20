# Faz 1 doğrulama kaydı

Tarih: 20 Eylül 2026. Son production build ve Chromium tarayıcı kontrolleri başarılı.

## Kapsam

- `/`, `/student`, `/institution`, `/transactions`, uzun referansla `/intent/[intentId]`.
- 320×800, 768×1024, 1440×1000 viewport'ları.
- 9 Playwright senaryosu: her viewport'ta route/taşma/axe, navigasyon/pasif form, klavye/404.
- 14 Vitest kontrolü: boş config, desteklenmeyen ağ, sahte/unsafe endpoint, mainnet endpoint, URL normalizasyonu, geçersiz contract biçimi.
- Lint, TypeScript ve production build başarılı; temiz npm ci başarılı.

## Görsel kanıt

- [Desktop overview](screenshots/phase-1-overview-desktop.png)
- [Mobile overview](screenshots/phase-1-overview-mobile.png)
- [Student workspace](screenshots/phase-1-student-desktop.png)
- [Institution tablet](screenshots/phase-1-institution-tablet.png)

Bunlar çalışan uygulamadan alınan ekran görüntüleridir. İçlerindeki yolculuk kartları örnektir; zincir işlemi kanıtı değildir. Tasarım kontrol kaynağı: ../DESIGN_DECISIONS.md.

## Çalıştırma

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Bu oturumda browser binaries `/tmp/arrivalpay-browsers` içine indirildi; bu yüzden test komutuna `PLAYWRIGHT_BROWSERS_PATH=/tmp/arrivalpay-browsers` eklendi. Normal kurulumda varsayılan Playwright dizini kullanılabilir. Oturumdaki localhost/browser sandbox kısıtlaması test komutu için genişletilmiş izin gerektirdi.

## Sınırlar

Otomatik axe kontrolü tam erişilebilirlik denetiminin yerine geçmez. Canlı wallet, Anchor veya Soroban testi yapılmadı; bunlar bu fazda uygulanmadı. ESLint 9.39.5, Next lint eklentisiyle uyumluluk için pinli ve npm tarafından deprecated olarak işaretleniyor. Testlerin başarıyla geçmesi üretime hazır finans uygulaması anlamına gelmez.
