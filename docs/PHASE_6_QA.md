# Faz 6 — Conditional Payment Intent uçtan uca entegrasyonu

20 Eylül 2026. Kod ve otomatik doğrulama hazır; gerçek kullanıcının Freighter ile uçtan uca kabul kontrolü ayrıca bekliyor.

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---|
| `npm run lint` | Geçti, sıfır uyarı |
| `npm run typecheck` | Geçti |
| `npm test` | 82/82 geçti (10 yeni soroban servis testi) |
| `npm run build` | Geçti |
| `npm run test:e2e` | 48/48 geçti (9 yeni intents testi) |
| `npm run test:live -- tests/live/soroban-intent.test.ts` | Geçti — bu uygulamanın kendi servis kodu, gerçek deploy edilmiş kontrata karşı |
| `cargo test -p conditional-payment-intent` | 16/16 geçti (değişmedi) |

## Kapsam

- `src/services/soroban/{client,errors,types,intents}.ts`: RPC istemcisi, kontrat hata kod eşlemesi (`Error(Contract, #N)` ayrıştırma), TS↔ScVal dönüşümleri, `prepareCreateIntent/prepareFundIntent/prepareApproveIntent/prepareRejectIntent/prepareClaimTimeoutRefund` (simulate+assemble), `submitInvocation` (imza doğrulama + gönder + `pollTransaction`), `getIntent`/`listByStudent`/`listByInstitution` (salt okunur simulate).
- `src/features/intents/{controller,provider,intent-row,intent-list,intent-detail,student-deposits,use-now}.tsx`: Wallet/Anchor controller'larıyla aynı epoch tabanlı yarış-güvenli desen. Rol farkı (öğrenci/kurum) her intent için `viewerAddress` karşılaştırmasıyla belirlenir — kontrat ayrıca `require_auth` uyguladığı için bu rol tespiti bir güvenlik sınırı değil, yalnızca UI kolaylığıdır.
- `src/features/institution/{create-intent-form,institution-requests}.tsx`: Kurum formu artık gerçek; rastgele 32-byte ID üretir (`randomIntentId`), imza ister, gönderir.
- `src/config/{env,network}.ts`: `NEXT_PUBLIC_INTENT_CONTRACT_ID` artık deploy edilmiş gerçek kontrata varsayılan oluyor (boşsa). `network.assetContractId`: gerçek Testnet USDC'nin deterministik Stellar Asset Contract adresi (`Asset.contractId`), canlı doğrulandı (symbol "USDC", 7 decimal).
- `/student`, `/institution`, `/intent/[intentId]` sayfaları gerçek kontrat okumalarına bağlandı.

## Kritik teknik bulgu: SAC "deploy" adımı

Canlı test yazarken gerçek bir hata bulundu: yeni basılan bir classic asset'in (test fixture'ı) Soroban Asset Contract'ı, birisi `createStellarAssetContract` operasyonunu göndermeden var olmuyor — `token::Client::transfer` çağrısı "trying to get non-existing value for contract instance" ile başarısız oluyor. Bu, gerçek USDC için sorun değil (issuer zaten defalarca kullanılmış, SAC'ı canlı doğrulandı — `decimals()`/`symbol()` gerçek RPC çağrısıyla teyit edildi), ama test fixture'ları için bir deploy adımı gerekli oldu; bu adım yalnızca `tests/live/soroban-intent.test.ts`'te, uygulamanın kendi servis kodunda değil.

## Canlı kanıt

`tests/live/soroban-intent.test.ts`, bu uygulamanın **kendi `src/services/soroban` kodunu** (Stellar CLI değil) kullanarak, geçici Node anahtarlarıyla gerçek deploy edilmiş kontrata karşı tam zinciri çalıştırır: create_intent → fund_intent → approve_intent, ardından `list_by_student`/`list_by_institution` sayfalama okumaları. Kanıt: `docs/evidence/phase-6-intent.json` (gerçek tx hash'leri, gerçek intent ID, `Released`/`Approved` son durum).

## Bilinen eksikler

- Gerçek kullanıcının Freighter'ıyla uçtan uca kabul (kurum formu doldurup imzalama, öğrenci fonlaması, kurum onayı) henüz gözlenmedi — yalnızca ephemeral Node anahtarlarıyla kanıtlandı.
- Playwright testleri Soroban RPC'nin JSON-RPC yüzeyini mock'lamıyor (tek POST endpoint'i birden fazla metodu multiplekslediği için); bunun yerine rol kapılaması ve gerçek ağa karşı hata yolunu (fonsuz hesap → okunabilir hata, çökme değil) doğruluyor. Tam mutlu yol kanıtı canlı teste ait.
- `claim_timeout_refund` ve `reject_intent` UI yolları yalnızca Rust testleriyle ve CLI ile (Faz 5) kanıtlandı; bu fazda ayrıca canlı TS-servis-kodu testi olarak tekrarlanmadı (zaman kısıtı; approve akışı önceliklendirildi çünkü aynı kod yolunu — `submitInvocation`/`prepareWrite` — reject/claim ile paylaşıyor).
- Anchor'dan gelen gerçek USDC'nin bir intent'e fonlanması (Faz 3-4 çıktısı ile Faz 6'nın birleşimi) ayrıca gösterilmedi; anchor'ın kendi USDC yerleşimi bu proje boyunca hiç tamamlanmadığı için (bkz. `docs/PHASE_3_4_QA.md`), bu uçtan uca zincir demo sırasında anchor'ın o anki durumuna bağlı.
- Commit/push yapılmadı.

## Sıradaki faz

Faz 7: UX durumları ve işlem kanıtları — Anchor + zincir geçmişinin kaynak etiketleriyle ayrılması, mobile/erişilebilirlik ince ayarı, confirmation modal'lar. Şartname protokolü gereği onay bekleniyor.
