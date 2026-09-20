# ArrivalPay uygulama planı

Tarih: 20 Eylül 2026. Durum: Plan kullanıcı tarafından onaylandı. Faz 2 kodu, otomatik testleri ve Testnet fixture kanıtı hazır; gerçek kullanıcı Freighter kabulü bekliyor. Faz 3 (Anchor discovery/SEP-10 auth) ve Faz 4 (TRY→USDC deposit) eksiksiz uygulandı ve gerçek anchor'a karşı canlı test edildi; anchor'ın kendi USDC yerleşimi bu oturumda tamamlanmadı (bkz. `docs/PHASE_3_4_QA.md`). Faz 5 (Soroban Conditional Payment Intent kontratı) eksiksiz uygulandı: 16/16 Rust testi geçti, Testnet'e deploy edildi (`CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK`), approve ve reject akışları gerçek işlemlerle kanıtlandı (bkz. `docs/CONTRACT.md`). Faz 6 (uçtan uca frontend-kontrat entegrasyonu) eksiksiz uygulandı: kurum/öğrenci UI'ları gerçek kontrata bağlandı, create→fund→approve zinciri bu uygulamanın kendi servis koduyla gerçek Testnet'te kanıtlandı (bkz. `docs/PHASE_6_QA.md`). Sırada Faz 7 (UX durumları ve işlem kanıtları) var.

## 1. Hedef ve mevcut durum

ArrivalPay, uluslararası öğrencinin kayıt depozitosunu TRY → Testnet USDC ile fonlamasını ve kurumun koşullarına göre Soroban üzerinde serbest bırakılmasını veya iadesini sağlar. Tek MVP intent türü `ENROLLMENT_DEPOSIT` olacaktır. Kurumun kararının doğruluğu zincirde doğrulanmaz; yetki ve para hareketi uygulanır.

Başlangıçta klasör boştu. Git deposu, package.json, uygulama, kontrat, env veya yeniden kullanılabilecek kod bulunmadı. `git status --short` “not a git repository” döndürdü. Node v24.18.1, npm 11.16.0, Rust 1.97.1 ve Cargo 1.97.0 mevcut; Stellar CLI yok. WASM hedefi henüz doğrulanmadı. Bu fazda kurulum, commit, push veya deployment yapılmadı.

Kaynak belgeler değişmeden köke kopyalandı. Geliştirme şartnamesi ve DESIGN.md tamamen; PDF'in 15 sayfasının çıkarılabilir metni tamamen okundu. Kaynak envanteri RESOURCES.md içindedir.

## 2. Kapsam ve kaynakların yorumlanması

- Kullanıcının bu isteği: belgeleri/kaynakları ekle, incele ve planlama işini başlat.
- Şartnamenin faz sırası korunur: temel → wallet → Anchor auth → deposit → contract → uçtan uca → UX → dokümantasyon → QA.
- Önce gerçek Anchor akışı korunur. Kontrat gecikirse fonlama akışı gösterilebilir, fakat bunun tam ArrivalPay MVP'si olduğu söylenmez.
- Gerçek banka, gerçek KYC, otomatik vize doğrulama, üretime hazır ürün ve garantili banka iadesi iddiaları yoktur.
- UI ve nihai README İngilizce; geliştirme planı ve ilerleme notları Türkçe olacaktır.

### PDF ile çapraz kontrol

| PDF dayanağı | Plan karşılığı / belirsizlik |
|---|---|
| s.1, 6: Genesis yeni ürün, Testnet prototipi | Boş klasörden Next.js + Soroban; Genesis hedefi |
| s.3–4: uygun ekosistem entegrasyonu | Stellar Wallets Kit gerçek imzalama için kullanılacak; Anchor ve Soroban temel akışta |
| s.3, 8: gerçek fiat rail; Anchor daha yüksek ağırlık | Proje şartnamesi yalnızca Mock Anchor istiyor. Testnet simülasyonunun bu ölçüte kabulü organizatör tarafından doğrulanmalı; otomatik uygunluk iddiası yok |
| s.8: auth, storage ve çalışan Testnet | Kontrat testleri, TTL stratejisi, canlı işlem kanıtı |
| s.5, 8: kullanılan skill yolları | Yalnızca gerçekten okunan/uygulanan Stellar skill dosyaları atıf alır |
| s.9, 12: başvuru, pitch, repo, canlı demo | Teslim kontrol listesine dahil; takım bilgileri ve portal kullanıcı/organizatörden gelir |
| s.2: 20 Eylül 12.00 teslim; s.9: portal TBD | PDF'deki takvim ve portal güncelliği teyit edilmemiştir; kalan süre varsayılmaz |
| s.8: passkey bonus | Faz 10; kritik yolun dışında |

## 3. Teknik kararlar

- Next.js App Router, strict TypeScript, Tailwind v4; sürümler Faz 1'de uyumluluk kontrolüyle seçilip lockfile'a sabitlenecek.
- `src/app` tek route kökü. `features` akışları; `services` dış iletişimi; `config` ağ, issuer ve endpoint'leri yönetir. UI doğrudan Anchor/RPC çağırmaz.
- Stellar SDK + Wallets Kit/Freighter adaptörü Faz 2'de eklenir. Next/React SSR sınırında wallet yalnızca client tarafında yüklenir.
- Rust Soroban SDK Faz 5'te eklenir; Stellar CLI ve `wasm32v1-none` hazırlığı o fazın ilk kapısıdır.
- Unit test aracı olarak Vitest; kritik UI akışı için Playwright planlanır. Bağımlılıklar ihtiyaç duyulan fazda gerekçeleriyle eklenir.
- USDC miktarı string ↔ bigint ölçekli birim ↔ contract i128 olarak taşınır. TRY 2, USDC 7 hane; float hesap yok. Görsel yuvarlama imzalanan tutarı değiştirmez.
- Token sözleşmesi canonical Testnet USDC issuer'dan türetilip doğrulanır; intent keyfi bir tokenla fonlanamaz. Final token ID tahmin edilmez.
- JWT ilk MVP'de yalnızca bellekte tutulur; refresh sonrası yeniden SEP-10. Wallet/account/network değişince oturum temizlenir. Kalıcı recovery kaydı sadece gizli olmayan transaction/intent kimlikleridir.
- Kalıcı merkezi backend başlangıçta yok. Anchor CORS ihtiyacı doğrulanırsa yalnızca allowlist'li proxy eklenir; kullanıcı URL'si kabul eden açık proxy yapılmaz.
- Intent keşfi: kontratta öğrenci/kurum için sayfalı ID indeksi ve okuma API'si tasarlanır; durum her zaman kontrattan okunur. Bu, iki farklı cihazdaki kurum/öğrenci listelerini yalnızca localStorage'a bağlamamak içindir. İndeks maliyeti Faz 5'te test edilir; sınırsız tek vektör tutulmaz.
- Kurum adı gibi off-chain sunum verileri ayrı tutulur. Public key bir kurumun gerçek dünyada doğrulandığı anlamına gelmez. Demo kurum kimliği açıkça etiketlenir.

## 4. Fazlar ve kabul kapıları

### Faz 0 — Kaynaklar, keşif, plan

Dosyalar: `ARRIVALPAY_DEVELOPMENT_PROMPT.md`, `DESIGN.md`, `stellar.pdf`, `RESOURCES.md`, `IMPLEMENTATION_PLAN.md`, `DESIGN_DECISIONS.md`, `PROGRESS.md`.

Çıktı: ürün/kapsam, ortam tespiti, riskler, faz sırası ve test planı. Kontrol: kopyaların SHA-256 eşitliği; belgelerin ve kaynakların varlığı. Plan onayından sonra Faz 1.

### Faz 1 — Temel proje ve tasarım tokenları

Bağımlılık: plan kilidi, npm paket erişimi. Eklenecekler:

- `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`, `.env.example`.
- `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/student/page.tsx`, `src/app/institution/page.tsx`, `src/app/intent/[intentId]/page.tsx`, `src/app/transactions/page.tsx`.
- `src/config/env.ts`, `src/config/network.ts`, `src/components/layout/app-shell.tsx`.
- `src/components/ui/{button,tag,status,form-field}.tsx`, `src/components/feedback/async-state.tsx`.
- `src/features`, `src/services`, `src/types`, `src/utils` altında yalnızca gerekli sorumluluklar; boş dosya yığını yok.

Tokenlar, Inter + mono, nav, Testnet etiketi, gerçek veri olmadığında empty state. Henüz bağlanmayan akışlar başarı göstermeyecek. Env örneğinde yalnız anahtar adları/boş değerler; secret yok. Kullanıcıya açık ayarlarla server-only ayarlar ayrılır.

Kabul/test: geliştirme sunucusu açılır; route shell'leri tutarlı; lint/typecheck/build geçer; 320/768/1440 px kontrolü. Env doğrulama için anlamlı sınır kontrolleri; basit stil değişikliklerine gereksiz unit test yazılmaz.

### Faz 2 — Wallet, Testnet, trustline

Dosyalar: `src/features/wallet/*`, `src/services/stellar/{client,account,trustline,transactions}.ts`, `src/config/network.ts`, `src/utils/amount.ts`, ilgili testler.

Gerçek connect/disconnect, public key/network kontrolü, XLM/USDC bakiyesi, account activation yönlendirmesi, trustline imzalama ve zincir sonucu. İşlem gönderimi ile kesinleşme ayrılır. Reserve/fee yetersizliği ve kullanıcının imzayı reddetmesi açıkça gösterilir.

Kabul/test: gerçek Testnet cüzdanı ve USDC trustline explorer kanıtı; cüzdan yok/yanlış ağ/hesap yok/imza ret/bakiye yetersizliği. Tutar parse/format sınırları ve issuer uyuşmazlığı unit testleri. Kullanıcı cüzdanı erişilemiyorsa unit testler canlı doğrulama sayılmaz.

### Faz 3 — Anchor keşfi ve auth

Dosyalar: `src/services/anchor/{discovery,auth,info,errors,types}.ts`, `src/features/anchor/*`, gerekirse sınırlı `src/app/api/anchor/*`.

Önce llms-full.txt, health, TOML ve SEP-6 info canlı doğrulanacak; mevcut değerler şartnameden gelen beklentidir. SEP-10 challenge imzalanmadan network, server signature, domain, account, timebounds ve challenge yapısı SDK doğrulamasıyla kontrol edilir. JWT loglanmaz. SEP-12 mock kabul akışı burada auth sonrasına yerleşir.

Kabul/test: gerçek wallet challenge → JWT → info. Sahte challenge, signing key/issuer uyuşmazlığı, 401/expiry, wallet değişimi, unsupported asset, güvenli hata mesajı testleri. API erişimi olmadan faz canlı entegrasyon açısından tamamlanmaz.

### Faz 4 — TRY → USDC deposit

Dosyalar: `src/services/anchor/{quote,deposit,transactions}.ts`, `src/features/anchor/{funding-flow,polling,recovery}.*`, `src/features/transactions/*`, unit/integration testleri.

Sıra: keşif/auth/mock SEP-12/info → quote → deposit talimatı → açık Testnet banka simülasyonu → polling → bakiye doğrulaması. Şartnamenin ekran listesinde quote imzadan önce görünse de authenticated/locked quote auth sonrasında alınır; önizleme varsa ayrı etiketlenir.

50.00–3000.00 TRY sınırı, fee/net amount ve quote expiry görünür. Sabit USDC intent tutarı için net fonun yeterliliği hesaplanır; eksik tutar sessiz yuvarlanmaz. `pending_user_transfer_start`, `pending_anchor`, `pending_trust`, `completed`, `error` işlenir; bilinmeyen durum başarıya dönüşmez. Polling bounded backoff ve iptal içerir; zaman aşımı “sonuç belirsiz”dir. POST körlemesine tekrarlanmaz; önce transaction recovery yapılır.

Kabul/test: gerçek Anchor deposit completed + Testnet USDC bakiye/işlem kanıtı; quote expiry, 49.99/50/3000/3000.01, 401, ağ kopması, refresh recovery ve duplicate-submit. Circle faucet bu kabulün yerine geçmez.

### Faz 5 — Soroban kontratı, test, deploy hazırlığı

Dosyalar: `contracts/conditional-payment-intent/Cargo.toml`, `Cargo.lock`, `src/{lib,types,errors,storage,events}.rs`, `src/test.rs` veya `tests/*`; `docs/CONTRACT.md`; config contract ID alanı.

API: create/fund/approve/reject/claim_timeout_refund/get_intent; ayrıca sayfalı liste okuma. Auth kaydedilmiş öğrenci/kurum üzerinden uygulanır. Persistent intent kayıtları ve ID indeksleri, instance ayarları, TTL uzatma/restore akışı tasarlanır. TTL, deadline gelince fonun kendiliğinden kaybolacağı varsayımına dayanmaz.

Önerilen sınır kuralı: fund ve approve için `now < deadline`; timeout için `now >= deadline`. Reject yalnız FUNDED durumunda öğrenciye iade eder. Bu kural approve/timeout yarışında deadline sonrası kurumun fonu almasını engeller; şartnamedeki belirsizliği netleştiren plan kararıdır.

12 zorunlu test: oluşturma; fonlama; approve transferi; reject iadesi; deadline sonrası iade; erken timeout reddi; yanlış kurum; yanlış öğrenci; double settlement; duplicate ID; invalid amount/deadline; bakiyeler. Ek olarak tam deadline sınırı, yanlış token, transfer hatasında atomiklik, çoklu intent fon ayrımı, TTL/restore ve liste sayfalama kontrol edilir. Auth testleri blanket mock auth ile yetkisiz çağrıyı yanlışlıkla geçirmemelidir.

Kabul: Rust testleri + WASM build; kullanıcı tarafından yetkilendirilmiş Testnet deploy sonrası gerçek contract ID/explorer kanıtı. İmzalama anahtarı istenmez ve frontend'e konmaz. Deploy izni yoksa test edilmiş artifact hazır tutulur; faz deploy edilmiş sayılmaz.

### Faz 6 — Conditional Payment Intent uçtan uca

Dosyalar: `src/services/soroban/{client,intents,transactions}.ts`, üretilen contract binding'leri, `src/features/intents/*`, `src/features/institution/*`, intent/student/institution route'ları.

Kurum create → öğrenci koşulları okur → Anchor ile USDC alır → exact amount escrow'a fund → kurum approve/reject veya öğrenci timeout. Tek kaynaktan contract enum/type binding; runtime tutar doğrulaması. Simulate/assemble → wallet signature → submit → kesinleşme → yeniden contract read. Role-aware UI güvenlik sınırı değildir; kontrat ayrıca auth uygular.

Kabul/test: ayrı öğrenci/kurum cüzdanlarıyla gerçek approve ve en az bir refund yolu; ilgili bakiyeler ve hash'ler. Diğer refund yolu kontrat testleriyle zorunlu, canlı kanıt da hedeflenir. Refresh, yanlış rol, çift tıklama, başarısız simulation ve eski UI durumu kontrol edilir.

### Faz 7 — UX ve işlem kanıtları

Dosyalar: feedback bileşenleri, intent timeline, funding recovery, transactions görünümü, `tests/e2e/*`.

Anchor ID ve zincir hash'i kaynak etiketleriyle ayrılır. Sahte tarihçe yok. Confirmation modal miktar/alıcı/geri döndürülemez sonucu açıklar. Klavye odağı, modal focus dönüşü, aria-live, uzun adres kırılması ve reduced-motion tamamlanır.

Kabul/test: 320/768/1440 px görsel kontrol; klavye akışı; refresh sonrası pending işleme dönüş. Mock'lu Playwright smoke yalnız UI kanıtıdır; canlı test ayrı kaydedilir.

### Faz 8 — README, pazar ve teslim belgeleri

Dosyalar: İngilizce `README.md` (şartnamenin 24 bölümü), `docs/{ARCHITECTURE,MARKET,SECURITY_AND_LIMITATIONS,DEMO}.md`, gerçek screenshot'lar ve evidence listesi.

Mimari/state Mermaid, setup/env/test sonuçları, gerçek contract/transaction/demo linkleri. 6.9M öğrenci iddiası, kurum depozito örnekleri ve rakip hacimleri birincil/güncel kaynakla doğrulanır; bulunamayan veri iddia edilmez. 0.56–4.0B model senaryodur, gelir/TAM gerçeği değildir. SCF/InstAward devam planı, kullanıcı doğrulama kanıtı varsa eklenir; hayali traction yok.

Kabul: bağımsız okuyucu kurulumu ve demo yolunu izleyebilir; yalnız çalıştırılmış komutlar doğrulanmış olarak yazılır. Takım/pitch/portal bilgileri eksikse görünür açık kalem olarak kaydedilir.

### Faz 9 — Final QA

Dosyalar: gerekli düzeltmeler, `docs/QA.md`, `PROGRESS.md`, README doğrulama kayıtları.

Temiz install, lint, typecheck, unit/contract tests, production build, kritik smoke, secret scan, link/env kontrolü, mobile/desktop QA, demo reset/recovery. Testnet resetinde yeniden deploy/config güncelleme anlatılır. Yeni hata yoksa gereksiz tekrar test turu yapılmaz.

Kabul: tüm kritik kontroller geçer; canlı demo ve transaction kanıtı mevcut; başarısız veya yapılmamış kontroller açıkça raporlanır. Public repo ve frontend yayınlama ayrıca yetkilendirilmiş olmalıdır.

### Faz 10 — İsteğe bağlı

Sıra: withdraw → Arrival Services QR → embedded/passkey araştırması → template registry → SDK. İlk 9 faz tamamlanmadan başlamaz. Withdraw'da anchor account_id, memo ve memo_type aynen uygulanır; tekrar bakiye/işlem kanıtı gerekir.

## 5. Riskler ve kesme sırası

| Risk | Önlem / etkisi |
|---|---|
| Anchor API erişimi ve bilinmeyen payload | Faz 3 başında erişimi tekrar doğrula; tahmini endpoint'le başarı üretme |
| PDF gerçek fiat şartı vs Mock Anchor | Organizatör kabulü belirsiz; README ve demo testnet sınırını saklamaz |
| CLI/WASM, SDK veya wallet sürüm uyumsuzluğu | İlgili faz başında resmi API/kurulu sürüm kontrolü; lockfile |
| XLM reserve, fees, trustline veya token issuer | Fonlamadan önce ağ/varlık doğrulaması ve düzeltici eylem |
| Quote net tutarı intent'i karşılamıyor | Fee sonrası exact miktar kontrolü; eksik tutarı göster |
| Deadline, çift settlement, TTL | Kontrat sınır testleri; restore ve yeniden sorgulama |
| İki cihazda intent görünmüyor | Paylaşılan kontrat indeksleri; localStorage yalnız recovery |
| Cüzdan veya yayın izni yok | Bağımsız kod/test hazırlığı devam eder; canlı kanıt uydurulmaz |
| Süre yetmiyor | Faz 10 tamamen kesilir; görsel süsler ve ileri filtreler azaltılır |

Kesilmeyecekler: gerçek Anchor deposit, temel wallet/trustline, auth ve para doğruluğu, temel contract akışları/testleri, testnet sınır açıklaması, işlem kanıtı. Bunlar yetişmezse kapsamın eksikliği raporlanır; “MVP tamamlandı” denmez.

## 6. Sonraki işlem

Faz 2 kullanıcı onayıyla uygulandı. Freighter kullanıcı kabulü ayrıca bekleniyor; sonraki geliştirme Faz 3 Anchor discovery/auth olacak. Şartname bölüm 0 gereği sonraki faz onayından sonra başlanır. Her fazın sonunda PROGRESS.md gerçek komut sonuçlarıyla ve docs/PRESENTATION_NOTES.md sunum anlatımıyla güncellenecektir.
