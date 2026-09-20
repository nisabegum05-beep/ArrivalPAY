# ArrivalPay kaynakları

Kayıt tarihi: 20 Eylül 2026. Kullanıcının verdiği bağlantılar aşağıdadır. Bağlantının listelenmesi içeriğinin doğrulandığı veya aracın kurulduğu anlamına gelmez.

## Yerel belgeler

- [Geliştirme şartnamesi](ARRIVALPAY_DEVELOPMENT_PROMPT.md)
- [Tasarım referansı](DESIGN.md)
- [Hackathon el kitabı — 15 sayfa](stellar.pdf)

## Kullanıcının paylaştığı kaynaklar

| Kaynak | Adres | Kullanım |
|---|---|---|
| Mock Anchor | https://tr-mock-anchor.fly.dev | Testnet fiat giriş/çıkış sağlayıcısı |
| Mock Anchor API (AI için) | https://tr-mock-anchor.fly.dev/llms-full.txt | SEP endpoint ve payload referansı |
| SEP Demo (interaktif) | https://tr-mock-anchor.fly.dev/explorer | Manuel entegrasyon incelemesi |
| Stellar Developer Docs | https://developers.stellar.org | Birincil teknik referans |
| Stellar AI Skills | https://skills.stellar.org | İlgili skill dosyalarını bulma |
| Raven MCP | https://raven.stellar.buzz | İsteğe bağlı geliştirme aracı |
| Stellar Lab | https://lab.stellar.org | Testnet hesap ve işlem incelemesi |
| Stellar Expert (Explorer) | https://stellar.expert | Zincir kanıtları |
| Circle USDC Faucet | https://faucet.circle.com | Testnet geliştirme fonları; Anchor demo kanıtının yerine geçmez |
| stellar-build | https://github.com/kaankacar/stellar-build | Örnek proje; çalıştırılmadan önce incelenecek |
| Stellar Wallets Kit | https://stellarwalletskit.dev | Cüzdan entegrasyonu |
| Smart Wallet Docs | https://developers.stellar.org/docs/build/apps/smart-wallets | MVP sonrası passkey araştırması |

## Bu incelemede erişim durumu

- Stellar resmi [kurulum rehberi](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup) ve Skills ana sayfası okundu. Kurulum rehberi Rust, Stellar CLI ve `wasm32v1-none` hedefini tanımlar. Sürümler uygulama fazında tekrar doğrulanacak.
- Mock Anchor llms-full.txt: web aracında erişim hatası; yerel curl denemesinde DNS çözümlenemedi. API ayrıntıları henüz canlı kaynakla doğrulanmadı. Bu sonuç servisin herkes için kapalı olduğunu kanıtlamaz.
- Diğer bağlantılar kaynak olarak kaydedildi, bu fazda içerikleri doğrulanmadı.
- Refero canlı stil araması NO_SUBSCRIPTION döndürdü. Kullanıcının DESIGN.md dosyası ve yerel Refero craft-details rehberi kullanıldı.
- Faz 0 sırasında belirli bir Stellar SKILL.md uygulanmadı.

## Faz 2'de kullanılan kaynaklar

- [Stellar dApp skill](https://skills.stellar.org/skills/dapp/SKILL.md) ve [Assets skill](https://skills.stellar.org/skills/assets/SKILL.md) okundu ve uygulandı; README içinde de kaydedildi.
- [Stellar Wallets Kit](https://stellarwalletskit.dev): güncel singleton API ve JSR kurulumu incelendi. SDK/Freighter imza ve ağ API'leri kurulu paket tiplerinden kontrol edildi.
- Gerçek Horizon ve Friendbot Testnet erişimi canlı trustline testi ile doğrulandı. Bu sonuç Mock Anchor erişimini doğrulamaz.

## Faz 3-4'te kullanılan kaynaklar

- Mock Anchor `https://tr-mock-anchor.fly.dev/health`, `/.well-known/stellar.toml`, `/sep6/info`, `/sep38/price`, `/guide` ve `/llms-full.txt` canlı olarak okundu; SEP-1/SEP-10/SEP-6/SEP-38 istek/yanıt şemaları tahmin edilmeden, gerçek yanıtlardan çıkarıldı.
- `@stellar/stellar-sdk`'nin `StellarToml.Resolver` (SEP-1) ve `WebAuth` (SEP-10) modülleri kullanıldı; belirli bir `skills.stellar.org` SEP skill dosyası bu fazda uygulanmadı — bkz. README "Stellar skills used".
- Anchor'ın `/guide` sayfasındaki "Statuses & callbacks" ve "Settlement details" bölümleri, `pending_anchor` durumunun "treasury low"/yoğunluk halinde de geçerli olduğunu doğrulamak için okundu (bkz. `docs/PHASE_3_4_QA.md` bilinen sınır notu).
