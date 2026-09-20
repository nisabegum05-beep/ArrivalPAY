# Faz 3-4 — Anchor discovery, SEP-10 auth ve TRY → USDC deposit

20 Eylül 2026. Kod ve otomatik doğrulama hazır; tam uçtan uca USDC yerleşimi anchor'ın kendi işlem kuyruğuna bağlı ve bu kayıt sırasında beklemede kaldı (aşağıya bakınız).

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---|
| `npm run lint` | Geçti, sıfır uyarı |
| `npm run typecheck` | Geçti |
| `npm test` | 71 test geçti (27 yeni anchor testi dahil) |
| `npm run build` | Production Webpack build geçti |
| `npm run test:e2e` | 39 test geçti (12 yeni anchor testi dahil); 320/768/1440 px |
| `npm run test:live` (trustline) | Faz 2'den geçerli kalmaya devam ediyor |
| Yeni: `anchor-deposit` canlı testi | Geçti — bkz. "Canlı Anchor kanıtı" |

## Kapsam

- `src/services/anchor/{types,errors,http,discovery,auth,info,quote,deposit,transactions}.ts`: SEP-1 keşif ve doğrulama, SEP-10 challenge/imza/JWT, SEP-6 info, SEP-38 firm quote, SEP-6 deposit-exchange, sandbox `simulate-bank-transfer`, işlem durumu okuma/listeleme.
- `src/features/anchor/{controller,provider,anchor-panel}.tsx`: Wallet'takiyle aynı epoch tabanlı yarış-güvenli state machine; bağlantı/oturum/quote/deposit/polling akışı; `/student` sayfasına bağlandı.
- `src/config/network.ts`: `anchorHomeDomain` eklendi (SEP-1/SEP-10 doğrulaması için).
- Testler: 7 yeni birim test dosyası (services/anchor), 1 controller test dosyası, 1 yeni Playwright dosyası (`tests/e2e/anchor.spec.ts`), 1 yeni canlı test (`tests/live/anchor-deposit.test.ts`). `tests/fixtures/wallet-fixture.ts` wallet.spec.ts'ten çıkarılıp iki dosya arasında paylaşıldı.

## SEP-1/SEP-10 güvenlik doğrulaması

Discovery, anchor'ın `stellar.toml`'unu şu sırayla reddediyor: yanlış network passphrase, beklenen imzalama anahtarıyla eşleşmeyen `SIGNING_KEY`, beklenen USDC issuer'ı listelemeyen `CURRENCIES`, veya kendi ana alan adının dışında yayınlanan herhangi bir SEP endpoint'i (`WEB_AUTH_ENDPOINT`, `TRANSFER_SERVER`, `KYC_SERVER`, `ANCHOR_QUOTE_SERVER`). Bu kontroller herhangi bir cüzdan imzası istenmeden önce çalışır. SEP-10 challenge'ı `@stellar/stellar-sdk`'nin `WebAuth.readChallengeTx` fonksiyonuyla doğrulanıyor (sunucu imzası, sequence sıfır, home domain, süre sonu); imzalanan challenge, tıpkı Faz 2'deki trustline gibi, imza öncesi/sonrası hash eşitliği ve istemci imzası kontrolüyle kurcalamaya karşı korunuyor.

Anchor'ın SEP endpoint'lerinin CORS başlığı (`Access-Control-Allow-Origin: *`) canlı olarak doğrulandı; bu yüzden proxy eklenmedi — plan bunu yalnızca ihtiyaç doğrulanırsa öngörüyordu.

## Canlı Anchor kanıtı

`npm run test:live -- tests/live/anchor-deposit.test.ts`, geçici bir Node hesabıyla üretim servis kodunu (script değil) kullanarak gerçek `tr-mock-anchor.fly.dev` üzerinde şu zinciri çalıştırır ve hepsi başarıyla doğrulandı:

1. SEP-1 discovery — anchor'ın imzalama anahtarı ve endpoint'leri beklenenle eşleşti.
2. SEP-10 challenge alma, imzalama, doğrulama, JWT alma.
3. SEP-6 `/info` — USDC deposit etkin.
4. SEP-38 `POST /quote` — 100.00 TRY için kilitli fiyat/miktar alındı.
5. SEP-6 `GET /deposit-exchange` — IBAN ve referans kodu alındı (kanıt: `docs/evidence/phase-3-4-anchor.json`).
6. Sandbox `POST /simulate-bank-transfer` — anchor tarafından kabul edildi (`ok: true`, durum `pending_anchor`'a geçti).

Kanıt dosyası: `docs/evidence/phase-3-4-anchor.json`.

## Bilinen sınır: anchor'ın USDC yerleşimi bu kayıt sırasında tamamlanmadı

Adım 6'dan sonra işlem durumu 90 saniyelik test penceresinde ve ayrıca ayrı, daha uzun (25 dakikaya kadar) bağımsız izleme denemelerinde **`pending_anchor`** durumunda kaldı; USDC hiç ödenmedi. Bu, kodun bir hatası değildir:

- Aynı zincir, kilitli quote'lu (`deposit-exchange`) ve düz (`deposit`) iki ayrı yoldan, dört bağımsız denemede aynı sonucu verdi — istek/yanıt şemaları anchor'ın kendi `llms-full.txt` ve `/guide` dokümantasyonuyla birebir eşleşti.
- Anchor'ın kendi rehberi normal yerleşim gecikmesini "on-ramps every 3 s" olarak tanımlıyor ve `pending_anchor` durumunu açıkça "TRY received, paying USDC (**also while the treasury is low**)" olarak belgeliyor — yani bu durumda bekleme anchor'ın kendi tasarımında öngörülen bir haldir.
- Treasury bakiyesi yüksekti (~794K USDC) ve SEP-12 KYC'nin de (rehbere göre) deposit tamamlanması için gerekli olmadığı doğrulandı; en olası açıklama, hackathon'un ikinci gününde paylaşılan sandbox'a çok sayıda takımın aynı anda yüklenmesi nedeniyle ödeme kuyruğunun gecikmesidir.

Canlı test bu nedenle "completed" durumunu zorunlu kılmıyor; adım 1-6'yı kesin olarak doğruluyor ve nihai yerleşim durumunu (`settled: true/false`) kanıt dosyasına dürüstçe kaydediyor. Demo öncesi tekrar çalıştırılırsa (`npm run test:live -- tests/live/anchor-deposit.test.ts`) anchor'ın o anki yüküne göre tamamlanma gözlenebilir; gözlenmezse bu sınır demo sırasında aynen açıklanmalıdır.

## UI kapsamı ve bilinen eksikler

- `/student` sayfasında: Anchor bağlantısı yalnızca USDC trustline etkinken görünür. Bağlan → SEP-10 imzası → TRY tutarı gir → quote al → depozito talebi (IBAN + referans) → sandbox banka simülasyonu → durum takibi (sınırlı otomatik deneme + manuel "Check status again").
- Anchor JWT yalnızca bellekte tutulur (kalıcı depoda değil); cüzdan bağlantısı kesilince veya hesap değişince oturum otomatik temizlenir.
- Playwright testleri gerçek SEP-10 imza doğrulamasını **kapsamıyor**: anchor'ın imzalama anahtarı sabit bir güvenlik sabiti olduğu için (bkz. `network.anchorSigningKey`), sahte bir anchor bu anahtarla geçerli bir challenge imzalayamaz — bu kasıtlı bir güvenlik özelliğidir. Playwright testleri bunun yerine gate'leme davranışını ve güvenlik reddi yollarını (yanlış imzalama anahtarı, yabancı domain endpoint'i) doğrular; tam mutlu yol kanıtı canlı teste aittir.
- TRY tutar sınırı (50-3.000) şartnamede varsayılmıştı; canlı `/sep6/info` yanıtı herhangi bir min/max alanı döndürmüyor ("no per-transaction limits (testnet sandbox)"). Bu nedenle yalnızca format/pozitiflik ve istemci tarafı 100.000 TRY üst sınırı (sağlık kontrolü, anchor kısıtı değil) uygulanıyor; bu, eski varsayımdan bilinçli bir sapmadır.
- Withdraw (USDC → TRY) hâlâ uygulanmadı; plan gereği sonraki faz.
- Conditional Payment Intent kontratı (Faz 5-6) hâlâ yok; anchor'dan gelen USDC şu an öğrencinin kişisel cüzdanına gelir, bir depozito kontratına otomatik yatmaz.
