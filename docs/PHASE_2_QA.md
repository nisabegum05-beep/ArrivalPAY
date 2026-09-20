# Faz 2 — Cüzdan ve USDC erişimi

20 Eylül 2026. Kod ve otomatik doğrulama hazır; kullanıcının gerçek Freighter uzantısıyla kabul kontrolü bekliyor.

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---|
| `npm run lint` | Geçti, sıfır uyarı |
| `npm run typecheck` | Geçti |
| `npm test` | 37 test geçti |
| `npm run build` | Production Webpack build geçti |
| `npm run test:e2e` | 27 test geçti; 320, 768, 1440 px |
| `npm run test:live` | 1 gerçek Stellar Testnet testi geçti |

Tarayıcı testleri production uygulamayı 3100 portunda çalıştırır. Freighter mesajlaşması ve Horizon yanıtları test fixture'ıdır. Başarılı bağlantı/imza, yanlış ağ, reddedilen imza, bulunamayan hesap, yetersiz XLM ve belirsiz gönderimden sonra durum kurtarma kontrol edildi. Sayfa taşması, klavye gezinmesi ve axe taramaları geçti. Bu kontroller gerçek Freighter uzantısını doğrulamaz.

Birim testleri tutar hassasiyetini, issuer eşleşmesini, rezerv/ücret sınırlarını, imzalanan işlemin değiştirilmediğini ve bağlantı kopması/hesap değişimi sırasında eski sonuçların kullanılmamasını kapsar.

## Gerçek zincir kanıtı

[Makine tarafından kaydedilen kanıt](evidence/phase-2-testnet.json) ve [Testnet işlemi](https://stellar.expert/explorer/testnet/tx/ce9a94b9789e9da01f9aa183518e2a4e41e8bb6aebd6e83b4dc457614b94c333).

Node testinde geçici bir hesap oluşturuldu; anahtarı yalnız bellekte tutuldu. Friendbot ile Testnet XLM alındı; uygulamanın işlem hazırlama, imza doğrulama, gönderme ve durum sorgulama servisleri kullanılarak kanonik USDC trustline açıldı. Sonuç: USDC erişimi authorized, bakiye 0 USDC. Bu işlem USDC satın alma, TRY yatırma veya öğrenci depozitosu ödeme kanıtı değildir. Testnet sıfırlanırsa explorer kaydı kaybolabilir.

## Gerçek Freighter ile kalan kabul kontrolü

1. `npm run dev` ardından `/student` ekranını aç; Freighter içinde Stellar Testnet seç.
2. Connect Freighter ile izin ver; açık adresin ve XLM/USDC bakiyelerinin kendi hesabına ait olduğunu kontrol et.
3. Hesap yoksa ekrandaki Friendbot bağlantısıyla test XLM al, durumu yenile.
4. Trustline yoksa Enable USDC ile issuer, rezerv ve ücreti incele; Freighter içinde işlemi onayla.
5. Confirmed ve Active durumlarını, explorer bağlantısını kontrol et. Trustline zaten varsa yeni işlem sunulmamalı.
6. Hesap/ağ değiştirip tekrar bağlanmayı ve imzayı reddetmeyi dene.

Uygulama gizli anahtar istemez. Normal Freighter hesabı kapsam dahilinde; mobil cüzdana yönlendirme, donanım cüzdanı ve multisig kabulü bu fazda doğrulanmadı.

## Görsel kanıt ve sınırlar

- `screenshots/phase-2-wallet-fixture-desktop.png`: çalışan arayüz, fixture hesap/bakiye/işlem verisi.
- `screenshots/phase-2-trustline-fixture-mobile.png`: 320 px işlem inceleme penceresi; alt eylemlere pencere içinde kaydırılarak erişilir.
- Görseller gerçek kullanıcı cüzdanı veya canlı işlem kanıtı olarak sunulmamalı.
- `npm audit --omit=dev`: 13 düşük, 6 orta; yüksek/kritik yok. Wallet Kit'in dolaylı bağımlılıklarında da bulgular var. Kör otomatik yükseltme yapılmadı; bağımlılık incelemesi açık kalemdir.
- Anchor/TRY fonlama, ödeme talebi, escrow ve iade akışı henüz uygulanmadı.
