# ArrivalPay — Stellar Pro Hackathon Modüler Geliştirme Promptu

> Bu dosyanın tamamını VS Code içindeki AI geliştirme ajanına ver. Proje deposunun kökünde `DESIGN.md` bulunmalıdır. Ajan, kod yazmaya başlamadan önce bu dosyayı ve `DESIGN.md` dosyasını eksiksiz okumalıdır.

---

## 0. Rolün ve çalışma biçimin

Sen kıdemli bir **Stellar/Soroban geliştiricisi, ürün mimarı, güvenlik odaklı full-stack mühendisi, teknik dokümantasyon yazarı ve ürün tasarımcısısın**. Görevin, Stellar Pro Hackathon Genesis Track için çalışan ve jüriye sunulabilir bir ArrivalPay MVP’si geliştirmektir.

Bu görevde hız önemlidir; ancak hız adına sahte entegrasyon, hardcoded başarı durumu, göstermelik blockchain kullanımı veya sürdürülemez dosya yapısı üretme. Var olan depoyu dikkatle incele, mevcut çalışan kodu koru ve gereksiz yeniden yazımlardan kaçın.

### Zorunlu çalışma protokolü

1. **İlk cevabında kod yazma.** Önce depoyu, bağımlılıkları, mevcut sayfaları, kontratları, yapılandırmayı ve `DESIGN.md` dosyasını incele.
2. İlk çıktı olarak `IMPLEMENTATION_PLAN.md` oluştur ve en verimli geliştirme sırasını belirt.
3. Planı; modüller, değişecek dosyalar, bağımlılıklar, kabul kriterleri, testler, riskler ve gerektiğinde kesilebilecek özelliklerle birlikte sun.
4. İlk planı sunduktan sonra dur ve kullanıcıdan açık onay iste.
5. Onaydan sonra yalnızca **tek fazı** uygula.
6. Her faz sonunda:
   - ne yaptığını,
   - hangi dosyaları değiştirdiğini,
   - hangi testleri/komutları çalıştırdığını,
   - sonuçları,
   - bilinen eksikleri,
   - sıradaki fazı
   kısa ve açık biçimde özetle.
7. `PROGRESS.md` dosyasını her faz sonunda güncelle.
8. Kullanıcının onayı olmadan sonraki faza geçme.
9. Kritik bir teknik karar gerektiğinde en fazla 2–3 seçenek sun; önerdiğin seçeneği ve nedenini açıkla.
10. Kullanıcı onaylamadıkça otomatik commit, push, deployment, veri silme veya geri döndürülemez işlem yapma.

### Mevcut kodu koruma kuralları

- Önce `git status`, dosya ağacı ve paket tanımlarını incele.
- Kullanıcının mevcut değişikliklerini silme veya üzerine körlemesine yazma.
- Var olan stack çalışıyorsa yeni framework’e geçme.
- Bağımlılıkları gereksiz yere yükseltme.
- Yeni bağımlılık eklemeden önce neden gerekli olduğunu belirt.
- Proje boşsa aşağıdaki varsayılan stack’i kullan.
- Kodları küçük, adlandırılmış ve tek sorumluluklu modüllerde tut.
- Ağ, kontrat ve Anchor detaylarını bileşenlerin içine gömme.
- Mock veriyi yalnızca açıkça `demo` veya `fixture` olarak etiketlenmiş geliştirme/test katmanında kullan.

---

# 1. Ürünün kesin tanımı

## Ürün adı

**ArrivalPay**

## Ana slogan

> **Turn one required enrollment payment into a reusable Stellar wallet.**

## Tek cümlelik tanım

ArrivalPay, uluslararası öğrencilerin zorunlu kayıt depozitolarını yerel para üzerinden USDC ile fonlamasını, kurumun önceden belirlediği şartlara göre Soroban üzerinde yönetmesini ve oluşan Stellar cüzdanını sonraki sınır ötesi ödemelerde kullanmaya devam etmesini sağlayan koşullu ödeme altyapısıdır.

## Basit problem

Uluslararası öğrenciler başka ülkelerdeki kurumlara kayıt depozitosu gönderirken:

- yerel para ile sınır ötesi ödeme yapmak,
- kur ve ödeme durumunu takip etmek,
- kurumun kabul/ret sürecini beklemek,
- iade koşullarına güvenmek,
- geciken iadeleri manuel olarak takip etmek

zorunda kalabilir. Mevcut çözümler çoğunlukla parayı taşır; ArrivalPay ise kurumun önceden açıkladığı **serbest bırakma, ret ve zaman aşımı** koşullarını uygulanabilir bir ödeme talebine dönüştürür.

## Basit çözüm

```text
Kurum ödeme talebi oluşturur
→ Öğrenci koşulları görür
→ TRY, Anchor üzerinden USDC’ye çevrilir
→ USDC Soroban kontratına yatırılır
→ Kabulde kuruma aktarılır
→ Rette veya zaman aşımında öğrenciye döner
```

## Ürünün gerçek farklılaşması

ArrivalPay “başka bir tuition payment app” değildir. Çekirdeği, daha sonra başka geliştiricilerin ve kurumların yeni ödeme senaryoları ekleyebileceği tekrar kullanılabilir bir **Conditional Payment Intent** yapısıdır.

MVP’de yalnızca `ENROLLMENT_DEPOSIT` senaryosu uygulanacaktır. Aşağıdakiler yalnızca yol haritasıdır:

- burs ve düzenli öğrenci yardımı,
- konaklama depozitosu,
- üniversite iadeleri,
- değişim programı hibeleri,
- kampüs ödemeleri,
- Arrival Services/ulaşım QR ödemeleri,
- farklı ülke Anchor adaptörleri,
- SDK ve gömülebilir ödeme bileşenleri.

Bu gelecekteki özellikleri MVP’ye doldurma. Mimariyi eklenebilir yap; yalnızca README yol haritasında anlat.

---

# 2. Neden Stellar ve Stellar’a sağlanan fayda

Ürün anlatısında Stellar bir logo veya cüzdan girişi değildir. Aşağıdaki yeteneklerin tamamı ürünün çekirdeğidir:

1. **Anchor:** Yerel para ile zincir üzerindeki USDC arasında standart giriş/çıkış.
2. **USDC ve trustline:** Sınır ötesi taşınabilir, denetlenebilir bakiye.
3. **Soroban:** Paranın hangi koşulda kime aktarılacağını uygulayan kontrat.
4. **Düşük maliyetli settlement:** Kurum ve öğrenciler arasında hızlı aktarım.
5. **Açık genişleme yüzeyi:** Başka geliştiricilerin yeni intent türleri ve hizmetler ekleyebilmesi.

### Ağ etkisi anlatısı

```text
Kurum sisteme katılır
→ her dönem yeni öğrencilere ödeme talebi gönderir
→ öğrenciler gerçek bir ihtiyaç nedeniyle Stellar cüzdanı kullanır
→ Anchor deposit/withdraw hacmi oluşur
→ USDC ve Soroban işlemleri artar
→ yeni hizmet sağlayıcılar aynı cüzdanlara erişir
→ geliştiriciler yeni payment-intent modülleri ekler
```

Ana mesaj:

> ArrivalPay, zorunlu bir gerçek dünya ödemesini Stellar’a sürdürülebilir kullanıcı kazanımı sağlayan bir giriş noktasına dönüştürür.

Stellar kaldırıldığında ürün; standart Anchor erişimini, programlanabilir escrow’u, taşınabilir USDC bakiyesini ve açık genişleme yüzeyini kaybetmelidir. Stellar’ı kaldırınca aynı ürün çalışabiliyorsa mimariyi yeniden değerlendir.

---

# 3. Dürüst sınırlar ve yasaklanan iddialar

README, arayüz ve sunum aşağıdaki sınırları dürüstçe açıklamalıdır:

- TR Mock Anchor yalnızca **Stellar Testnet** içindir; gerçek banka transferi veya gerçek para işlemez.
- `simulate-bank-transfer` yalnızca mock ortama aittir.
- SEP-12 doğrulaması mock ortamda otomatik onaylanır; gerçek KYC yapılmaz.
- Gerçek üretim modeli lisanslı Anchor/ödeme ortakları gerektirir.
- Kurumun, kontratta fonlanmış ödemeyi geçerli depozito kabul etmesi gerekir.
- Akıllı kontrat bir öğrencinin gerçekten vize reddi alıp almadığını kendi başına bilemez.
- MVP vize sonucunu otomatik doğrulamaz.
- Kontrat kurumun verdiği kararın doğruluğunu değil, yetkili karar sonrasında paranın kurala uygun hareket etmesini garanti eder.
- Mock Anchor limiti nedeniyle demo depozitosu 50–3.000 TRY arasındadır; gerçek üniversite depozitosu olduğu iddia edilmez.

Şu ifadeleri kullanma:

- “Completely trustless”
- “No regulation required”
- “Replaces universities”
- “Automatically verifies visa rejection”
- “Works with real banks”
- “Instant refund to every bank account”
- “Zero cost”
- “Available globally”
- “Production ready”

---

# 4. Hackathon gereksinimleri

ArrivalPay aşağıdaki Stellar Pro Hackathon önceliklerini görünür biçimde karşılamalıdır:

| Gereksinim | Üründeki karşılığı |
|---|---|
| Anlamlı gerçek dünya problemi | Uluslararası kayıt depozitosu ve koşullu iade |
| Çalışan Stellar entegrasyonu | Testnet hesapları, USDC trustline ve gerçek zincir işlemleri |
| Anchor/local payment | SEP-1, SEP-10, SEP-6 ve SEP-38 ile TRY/USDC akışı |
| Core feature | Anchor olmadan fonlama; Soroban olmadan koşullu ödeme çalışmaz |
| Kullanıcı deneyimi | Koşulu gör, cüzdanı bağla, fonla, sonucu takip et |
| Teknik uygulama | Deploy edilmiş ve test edilmiş Soroban kontratı |
| Süreklilik | Yeni intent türleri, ülke adaptörleri ve gelecekte SDK |
| Dokümantasyon | Açık README, mimari, demo ve testnet bağlantıları |

Final teslimde bulunması gerekenler:

- Public GitHub uyumlu repo
- Açıklayıcı İngilizce README
- Çalışan frontend
- Stellar Testnet entegrasyonu
- Deploy edilmiş Soroban contract ID
- Contract/testnet transaction linkleri
- `.env.example`
- Kurulum ve demo talimatları
- Mimari diyagram
- Contract state diyagramı
- Bilinen sınırlamalar
- Hackathon sonrası yol haritası
- Kullanılan Stellar skill/dokümantasyon yollarına atıf

---

# 5. Teknik stack

Önce mevcut depoyu incele ve çalışan stack’i koru. Proje boşsa varsayılan olarak:

- **Frontend:** Next.js App Router + TypeScript strict mode
- **Styling:** Tailwind CSS v4 veya mevcut projedeki eşdeğer token sistemi
- **Wallet:** Stellar Wallets Kit/Freighter uyumlu adapter
- **Stellar:** Güncel `@stellar/stellar-sdk`; yüklü sürümün gerçek API’sini kontrol et
- **Smart contract:** Soroban Rust
- **Contract token:** Testnet USDC’nin Stellar Asset Contract temsili
- **Tests:** Rust contract tests + frontend unit tests; mümkünse bir kritik Playwright smoke flow
- **Deployment:** Mevcut platform; yoksa Vercel uyumlu frontend

Eski kod örneklerini körlemesine kopyalama. Özellikle `Server`/`Horizon.Server`, RPC ve wallet imzalama API’lerinin kurulu SDK sürümündeki karşılığını kontrol et.

### Güvenlik zorunlulukları

- Secret key’i frontend’e, kaynak koda, localStorage’a veya repoya koyma.
- Kullanıcı işlemleri cüzdan üzerinden imzalanmalı.
- SEP-10 challenge da kullanıcı cüzdanı üzerinden imzalanmalı.
- Sadece açıkça test fixture’ı olan hesaplar server-side test ortamında secret kullanabilir.
- JWT token’ı loglama; gereğinden uzun süre saklama.
- `.env.example` yalnızca anahtar adlarını içermeli.
- PII veya vize belgesi zincire yazma.
- External reference için gerekirse yalnızca anlamsız bir referans/hash sakla.
- Tüm tutarları string/kanonik amount biçiminde işle; floating-point hesaplama yapma.
- TRY iki, USDC yedi ondalık hassasiyet kuralını koru.
- Contract authorization, double-settlement, deadline ve invalid-state testleri yaz.

---

# 6. Önerilen modüler dosya yapısı

Mevcut projeye uyarlayarak benzer sorumluluk ayrımı oluştur:

```text
arrivalpay/
├── app/ veya src/app/
│   ├── (marketing)/
│   ├── student/
│   ├── institution/
│   ├── intent/[intentId]/
│   ├── transactions/
│   └── api/                    # yalnızca gerekiyorsa güvenli proxy/adapter
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── feedback/
│   ├── features/
│   │   ├── wallet/
│   │   ├── anchor/
│   │   ├── intents/
│   │   ├── institution/
│   │   └── transactions/
│   ├── services/
│   │   ├── stellar/
│   │   ├── anchor/
│   │   └── soroban/
│   ├── config/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── contracts/
│   └── conditional-payment-intent/
│       ├── src/
│       └── tests/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO.md
│   ├── MARKET.md
│   └── SECURITY_AND_LIMITATIONS.md
├── public/
├── DESIGN.md
├── IMPLEMENTATION_PLAN.md
├── PROGRESS.md
├── README.md
└── .env.example
```

### Sınırlar

- UI bileşenleri Anchor veya Soroban’a doğrudan fetch yapmamalı.
- `features` kullanıcı akışını, `services` dış sistem iletişimini yönetmeli.
- Stellar adresleri, issuer ve endpoint’ler tek config katmanında bulunmalı.
- Contract durumları frontend’de bağımsız stringlerle yeniden icat edilmemeli; paylaşılan enum/type kullanılmalı.
- Her feature kendi UI, hook, service adapter ve type dosyalarına ayrılmalı; aşırı küçük dosya üretme.
- Gelecekte `intent type` eklemek için çekirdek contract/UI yeniden yazılmamalı.

---

# 7. Domain modeli

## Roller

### Student

- Cüzdanını bağlar.
- Anchor üzerinden USDC edinir.
- Yalnızca kendisine atanmış intent’i fonlar.
- Durumu takip eder.
- Rette veya zaman aşımında iade alır.

### Institution

- Ödeme intent’i oluşturur.
- Kendi intent’i için kabul veya ret verir.
- Kabul gerçekleşmeden fonu çekemez.

### Protocol

- Durumu ve yetkilendirmeyi uygular.
- Parayı kontratta tutar.
- Kabulde kuruma aktarır.
- Rette/zaman aşımında öğrenciye aktarır.

## Intent alanları

En az:

```ts
type PaymentIntent = {
  id: string;
  kind: 'ENROLLMENT_DEPOSIT';
  student: string;
  institution: string;
  token: string;
  amount: string;
  deadline: number;
  externalReference?: string;
  status: 'CREATED' | 'FUNDED' | 'RELEASED' | 'REFUNDED';
  resolution?: 'APPROVED' | 'REJECTED' | 'TIMEOUT';
};
```

## Durum geçişleri

```text
CREATED → FUNDED
FUNDED → RELEASED       (institution approval)
FUNDED → REFUNDED       (institution rejection)
FUNDED → REFUNDED       (student timeout claim after deadline)
```

Başka geçişe izin verme. Sonuçlanmış intent tekrar sonuçlandırılamaz.

---

# 8. Soroban kontrat gereksinimleri

Kontrat API isimlerini mevcut Rust/Soroban teamüllerine göre netleştir; anlamsal olarak şunları sağlamalıdır:

```text
create_intent
fund_intent
approve_intent
reject_intent
claim_timeout_refund
get_intent
```

### Beklenen davranış

- `create_intent`: institution auth ister; benzersiz ID, öğrenci, kurum, token, amount ve deadline kaydeder.
- `fund_intent`: student auth ister; token transferini öğrenciden contract address’e yapar; `CREATED → FUNDED`.
- `approve_intent`: yalnızca ilgili institution auth; USDC kuruma; `FUNDED → RELEASED`.
- `reject_intent`: yalnızca ilgili institution auth; USDC öğrenciye; `FUNDED → REFUNDED`.
- `claim_timeout_refund`: deadline geçtikten sonra öğrenci auth; USDC öğrenciye; `FUNDED → REFUNDED`.
- `get_intent`: salt okunur intent durumu.

### Kontrat gereksinimleri

- Stellar Asset Contract token interface kullan.
- Ledger timestamp ile deadline doğrula.
- Yetkisiz çağrıları reddet.
- Aynı ID ile ikinci intent’i reddet.
- Yanlış durumda yapılan çağrıları reddet.
- Sıfır/negatif amount’u reddet.
- Deadline geçmişken yeni fonlamayı reddet.
- Her önemli geçiş için event yayınla.
- Hata türlerini açık enum olarak tanımla.
- Storage TTL/extend stratejisini güncel Soroban uygulamalarına uygun tasarla.
- Kişisel veri veya doküman içeriği saklama.

### Zorunlu contract testleri

1. Intent oluşturma
2. Başarılı fonlama
3. Kabul ve kuruma transfer
4. Ret ve öğrenciye iade
5. Deadline sonrası iade
6. Deadline öncesi timeout iadesinin reddi
7. Yetkisiz kurum kararı
8. Yetkisiz öğrenci fonlaması
9. Double settlement reddi
10. Duplicate intent ID reddi
11. Invalid amount/deadline
12. Balance değişimlerinin doğrulanması

Contract deploy edilmeden önce tüm testler geçmelidir. Deploy sonucu contract ID ve explorer linki dokümante edilmelidir.

---

# 9. TR Mock Anchor entegrasyonu — bağlayıcı teknik şartname

## Sabit bilgiler

```text
Home Domain: tr-mock-anchor.fly.dev
Network: Stellar Testnet
Network Passphrase: Test SDF Network ; September 2015
Asset: USDC
USDC Issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
Treasury: GCLCZEQZ2THTEDAOFI66LACNPLY4OBKN7VKLEZFMBIHYKYQOW2W7T3Z6
Signing Key: GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M
```

## Endpoint’ler

```text
GET  https://tr-mock-anchor.fly.dev/.well-known/stellar.toml
GET  https://tr-mock-anchor.fly.dev/auth?account={G...}
POST https://tr-mock-anchor.fly.dev/auth
     https://tr-mock-anchor.fly.dev/sep12
     https://tr-mock-anchor.fly.dev/sep38
     https://tr-mock-anchor.fly.dev/sep6
GET  https://tr-mock-anchor.fly.dev/health
```

## Limitler

- Deposit: 50.00–3,000 TRY
- Withdraw: minimum 1.0000000 USDC
- TRY: 2 ondalık
- USDC: 7 ondalık
- Kur: Reflector oracle + 50 bps spread

## Zorunlu entegrasyon sırası

1. **SEP-1:** `stellar.toml` keşfi; endpoint, signing key ve asset issuer doğrulaması.
2. **Wallet/Testnet:** Hesap durumu ve USDC trustline kontrolü.
3. **SEP-10:** Challenge al; kullanıcının bağlı cüzdanıyla imzalat; JWT al.
4. **SEP-12:** Mock ortamda otomatik onay; gerçek KYC yapılıyormuş gibi UI üretme.
5. **SEP-6 info:** Desteklenen varlık, limit ve fee bilgisini oku.
6. **SEP-38:** TRY satış tutarı için fiyat/kilitli quote al; süre sonunu göster.
7. **SEP-6 deposit:** TRY → USDC deposit başlat; banka talimatını göster.
8. **Mock simulation:** Yalnızca demo ortamında banka transferini simüle et.
9. **Polling:** `pending_user_transfer_start`, `pending_anchor`, `pending_trust`, `completed`, `error` durumlarını yönet.
10. **History:** SEP-6 transaction/transactions endpoint’lerinden geçmişi göster.

Withdraw akışı, yukarıdakiler eksiksiz çalıştıktan sonra ayrı bir fazda eklenebilir. Withdraw sırasında anchor’ın döndürdüğü `account_id`, `memo` ve `memo_type: id` aynen kullanılmalıdır.

## Asset formatları

```text
Fiat: iso4217:TRY
Stellar: stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

## Anchor service tasarımı

Tek sorumluluklu fonksiyonlar oluştur:

```text
discoverAnchor()
authenticateWithSep10()
getTransferInfo()
getQuote()
startDeposit()
simulateBankTransfer()
getTransaction()
listTransactions()
startWithdraw()          # sonraki faz olabilir
```

### Hata yönetimi

- 401 → token süresi dolmuş; yeniden SEP-10 auth öner.
- `pending_trust` → trustline oluşturma CTA’sı göster.
- 50 TRY altı / 3.000 TRY üstü → form doğrulaması.
- Unsupported asset → yapılandırılmış hata.
- Quote expired → yeni quote al.
- Polling timeout → işlemi başarısız sayma; “durum henüz kesinleşmedi” göster ve yeniden kontrol sun.
- Network hatası → kullanıcıya düzeltici eylem içeren mesaj.

Anchor’ın tüm `{ "error": "..." }` yanıtlarını güvenli bir uygulama hata tipine dönüştür.

---

# 10. Frontend kullanıcı akışları

## A. Landing page

Amaç: Ürünü üç saniyede anlatmak.

İçerik:

- Wordmark: ARRIVALPAY
- Headline: “One required payment. One reusable Stellar wallet.”
- Açıklama: Öğrencinin TRY ile koşullu kayıt depozitosu fonladığını ve sonucunu izlediğini anlatan tek paragraf.
- Ana CTA: `Open student demo`
- İkincil CTA: `View institution demo`
- Sağ tarafta veya devamında gerçek ürün durumlarını temsil eden üç pastel kart:
  - `QUOTE READY`
  - `DEPOSIT FUNDED`
  - `AWAITING INSTITUTION`
- “Why Stellar” bölümü: Anchor, USDC, Soroban; üç kısa ve somut açıklama.
- “Built for extension” bölümü: yalnızca roadmap modülleri, çalışıyormuş gibi gösterme.
- Testnet uyarısı.

## B. Student dashboard

- Bağlı cüzdan ve kısaltılmış public key
- XLM ve USDC durumu
- Trustline durumu ve gerekiyorsa `Enable USDC`
- Öğrenciye atanmış intent’ler
- Her intent için amount, institution, deadline, status ve explorer linki
- `Fund with TRY` ana aksiyonu
- Bekleyen Anchor işlem durumu
- İade uygun olduğunda `Claim refund`

## C. Anchor funding flow

Adımlar:

1. TRY tutarı
2. Quote sonucu ve expiry
3. SEP-10 wallet signature
4. Deposit talebi/banka talimatı
5. Demo banka transferi simülasyonu
6. Polling durum ekranı
7. USDC geldiğinde başarı ve intent’i fonlama CTA’sı

Her adımın geri dönüşü ve hata durumu olmalı. Kullanıcı işlem yarıda kalınca transaction ID ile kaldığı yerden durum sorgulayabilmeli.

## D. Intent detail

- Kurum adı
- Öğrenci wallet’ı
- USDC tutarı
- Deadline
- Açık release/refund koşulları
- Durum zaman çizgisi
- Anchor transaction ID
- Stellar/Soroban transaction linkleri
- Kullanıcının rolüne göre yalnızca geçerli aksiyon

## E. Institution dashboard

- Yeni intent oluşturma formu
- Created/Funded/Resolved filtreleri
- Fonlanmış intent için `Approve and release` ve `Reject and refund`
- Karar öncesi net confirmation modal
- Karar sonrası transaction hash

## F. Transaction history

- Anchor ve on-chain işlemleri aynı görünümde fakat kaynak etiketiyle ayır.
- Durum, tarih, tutar, tür ve explorer linki.
- Gerçek veri yoksa boş durum göster; sahte işlemler ekleme.

---

# 11. Tasarım sistemi — `DESIGN.md` bağlayıcıdır

Kod yazmadan önce `DESIGN.md` dosyasını tamamen oku ve kısa bir `DESIGN_DECISIONS.md` oluştur. Burada hangi kuralların doğrudan korunduğunu ve fintech/işlem durumlarına nasıl uyarlandığını yaz.

## Referans kilidi

### Ana yön

Huddle referansındaki **flat editorial inventory** dili ArrivalPay’e uyarlanacaktır:

- beyaz kâğıt benzeri canvas,
- büyük fakat hafif ağırlıklı sans başlıklar,
- pastel status kartları,
- 1px hairline border,
- shadowsuz yüzeyler,
- uppercase micro-label ve nokta/step ön ekleri,
- geniş boşluk,
- doküman/katalog hissi,
- işlevsel, sakin ve güvenilir finans dili.

### Ana renk tokenları

```css
--color-paper-white: #ffffff;
--color-ink-black: #151515;
--color-graphite: #23241f;
--color-slate-gray: #3a4444;
--color-stone-border: #333333;
--color-mist-gray: #808080;
--color-bone: #e5e6e1;
--color-pale-sage: #d3e5e9;
--color-lavender-mist: #bbb2ce;
--color-dusty-rose: #cb9da2;
--color-deep-violet: #453b60;
--color-burnt-amber: #65451d;
--color-honey-gold: #e4b976;
--color-burgundy: #5c2529;
--color-blush-border: #d79caa;
```

### ArrivalPay semantic renk eşlemesi

Renkleri dekorasyon için rastgele dağıtma:

- **Pale Sage:** ready, funded, trustline active, quote ready
- **Lavender Mist:** active, awaiting institution, processing
- **Dusty Rose:** rejected, refund pending, attention-required
- **Bone/White:** neutral, created, historical/completed supporting surfaces
- **Burgundy:** yalnızca gerçek error/destructive durum
- **Deep Violet:** aktif link, outlined action ve sınırlı interaktif vurgu
- **Burnt Amber:** birincil CTA fill ve imza niteliğindeki tag/outline tonu
- **Honey Gold:** yalnızca küçük highlight/tag text; büyük yüzey yapma

### Tipografi

- Nng mevcut değilse **Inter** veya eşdeğer geometrik sans kullan.
- Kimlik, transaction hash, contract ID ve timestamp için JetBrains Mono/IBM Plex Mono kullan.
- Bir ekranda en fazla iki font ailesi.
- Display: 44–69px desktop, 36–48px mobile, weight 300–400.
- Heading: 29–40px, weight 400–500.
- Body: 16–18px, weight 400.
- Micro label: 12–13px, weight 500, uppercase, `letter-spacing: 0.06em–0.10em`.
- Önemli sayılarda `font-variant-numeric: tabular-nums`.
- Başlıklarda `text-wrap: balance`, açıklamalarda gerektiğinde `text-wrap: pretty`.
- Body paragraf genişliğini yaklaşık 65ch ile sınırla.

### Radius sözlüğü

- Badge: 4px
- Standard card: 8px
- List item/expanded panel: 24px
- Hero/feature card: 40px
- Tag/secondary button: 100px
- Primary action: 1000px/fully rounded

Her elemente aynı radius’u verme.

### Layout

- Max width: 1200px
- Section gap: yaklaşık 64px
- Card padding: 24px
- Element gap: 12px
- Landing hero: asimetrik iki kolon; solda ürün anlatısı, sağda canlı durum kartları.
- Dashboard: belge/katalog hissini koruyan listeler ve bölücüler; her şeyi karta sarma.
- Mobilde tek kolona in; dokunma alanları en az 44px.

### Yüzey ve elevation

- Box-shadow kullanma.
- Gradient kullanma.
- Elevation yalnızca pastel surface + 1px hairline border ile oluşturulsun.
- Pastel yüzey üstünde beyaz metin kullanma.
- Body metnini center-align yapma.

### Kart kullanım kuralı

Kart yalnızca şu durumlarda kullanılmalı:

- tıklanabilir intent,
- işlem durumu,
- form/confirmation,
- kullanıcı etkileşimi olan konteyner.

Salt metin gruplarını gereksiz kartlara koyma; bölüm, kolon ve divider kullan.

### İkon ve görsel stratejisi

- Emoji kullanma.
- Generic 3D illustration, stock photo, blob ve dekoratif zincir görseli kullanma.
- Ana görsel dil gerçek status kartları ve ürün UI’sıdır.
- Küçük bullet, arrow veya gerekirse sade SVG ikon kullan.
- Ürün tamamlandığında README’ye gerçek ekran görüntüsü ekle; sahte dashboard mockup’ı üretme.

### Yasak AI tasarım kalıpları

- Indigo/violet gradient SaaS görünümü
- Her şeyi eşit kart gridine koymak
- Glassmorphism
- Neon blockchain estetiği
- Koyu mod varsayılanı
- Serif + italic tek kelimelik dekoratif hero
- “Revolutionary”, “seamless”, “next-generation” gibi kanıtsız metinler
- Devasa anlamsız KPI kartları
- Dekoratif sol renk şeridi
- Aynı ekranda çok sayıda renk ve font weight

### Erişilebilirlik

- WCAG AA kontrastı kontrol et.
- Klavye navigasyonu ve görünür focus state.
- Form label’ları görünür olsun.
- Loading, empty, error ve success durumları yalnızca renkle anlatılmasın.
- Reduced-motion tercihine saygı göster.
- Responsive test: 320px, 768px, 1440px.

---

# 12. README.md zorunlu kurgusu

README ana dili İngilizce olsun. Teknik ve pazar anlatısı somut, dürüst ve AI değerlendirmesinde kolay ayrıştırılabilir olmalıdır.

## Zorunlu bölüm sırası

1. **Title + sticky line**
   - `ArrivalPay`
   - `Turn one required enrollment payment into a reusable Stellar wallet.`

2. **30-second overview**
   - Kullanıcı, problem, çözüm, Stellar’ın rolü.

3. **The problem**
   - Uluslararası kayıt depozitosu ve şartlı iade.
   - Problemi “dünyadaki tüm öğrenciler bunu yaşıyor” diye genelleme.

4. **Why this market matters**
   - Yaklaşık 6.9 milyon uluslararası öğrenci bulunduğuna dair kaynak.
   - Bazı kurumların CAS/kayıt öncesi depozito istediğine dair örnekler.
   - Flywire gibi büyük oyuncuların ödeme hacmi, pazarın doğrulaması ve aynı zamanda rekabet kanıtı.
   - Pazar hesabını TAM iddiası değil, varsayımlı senaryo olarak sun.

5. **Market estimate — assumptions, not facts**

   Açıkça aşağıdaki gibi formülleştir:

   ```text
   Annual new internationally mobile students (assumption): 1.4M–2.0M
   Share facing an upfront deposit (assumption): 20%–40%
   Typical modeled deposit: $2,000–$5,000
   Modeled annual conditional-deposit flow: roughly $0.56B–$4.0B
   ```

   Bunun ArrivalPay geliri olmadığını belirt. İlk ulaşılabilir pazarın birkaç kurum ve tek koridor olduğunu söyle.

6. **Existing solutions and differentiation**
   - Flywire/Convera/TransferMate ödemeleri, FX’i ve mutabakatı çözer.
   - ArrivalPay’in farkı: institution-authored conditions + open Soroban intent + reusable wallet + developer extension surface.
   - “No competitor exists” deme.

7. **The product**
   - Dört adımlı kullanıcı akışı.

8. **Why Stellar**
   - Anchor, USDC/trustline, Soroban, low-cost settlement ve composability.

9. **How ArrivalPay benefits the Stellar network**
   - Institution-led distribution loop.
   - New wallets, Anchor volume, USDC activity, contract calls ve future modules.

10. **Architecture**
    - Mermaid diyagramı.
    - Frontend, wallet, Anchor, Soroban, SAC USDC ve Stellar network.

11. **Contract state machine**
    - CREATED/FUNDED/RELEASED/REFUNDED.

12. **Anchor integration**
    - SEP-1/10/6/12/38 ve testnet sınırı.

13. **Repository structure**

14. **Getting started**
    - Gereksinimler, env, install, contract build/test/deploy, frontend run.

15. **Environment variables**
    - Secret içermeyen tablo.

16. **Testing**
    - Çalıştırılmış testler ve komutlar.

17. **Live demo and Testnet evidence**
    - Frontend URL, contract ID, Stellar Expert/Lab transaction linkleri.

18. **Demo script**
    - 2–3 dakikalık adım adım anlatım.

19. **Security and privacy**

20. **Limitations and trust assumptions**
    - Institution participation, off-chain decision, mock anchor, regulation.

21. **Roadmap**
    - Önce gerçek kurum pilotu; sonra yeni intent türleri, Anchor adaptörleri, SDK, Arrival Services.

22. **Hackathon requirement mapping**

23. **Acknowledgements / skills used**
    - Kullanılan Stellar skill dosyaları ve resmi kaynaklar.

24. **License**

### README yazım ilkeleri

- Önce sonuç, sonra teknik detay.
- Kısa cümle ve somut fiil kullan.
- Kanıtsız “best”, “revolutionary”, “global” gibi iddialardan kaçın.
- Kaynak linklerini doğrudan ilgili iddianın yanına koy.
- Gerçek olmayan metrik oluşturma.
- Roadmap özelliğini çalışan özellik gibi göstermeme.
- README’de en az bir gerçek mimari diyagram ve bir state diagramı olmalı.
- Build/test komutlarının gerçekten çalıştığını doğrulamadan yazma.

---

# 13. En verimli geliştirme fazları

İlk analizden sonra bu fazları repo durumuna göre ayrıntılandır. Sıralamayı keyfî olarak değiştirme; değiştirmen gerekiyorsa nedenini açıkla.

## Faz 0 — Repo keşfi ve plan kilidi

Yapılacaklar:

- Repo ve `git status` incelemesi
- Mevcut stack ve bağımlılıklar
- `DESIGN.md` analizi
- Mevcut Anchor/Soroban kodunun tespiti
- Ortam değişkenleri ve güvenlik riski kontrolü
- `IMPLEMENTATION_PLAN.md`
- `DESIGN_DECISIONS.md`
- `PROGRESS.md`

Kabul kriteri: Kullanıcı hangi dosyaların hangi sırayla değişeceğini anlayabiliyor ve planı onaylıyor.

## Faz 1 — Temel proje iskeleti ve design tokens

Yapılacaklar:

- Modüler klasörler
- Config/env validation
- `DESIGN.md` tokenları
- Layout, typography, button, tag, status, form ve feedback primitive’leri
- Landing/student/institution için route shell’leri
- Responsive temel

Kabul kriteri: Uygulama çalışır; design tokenları merkezi; sayfalar boş fakat tutarlı shell içerir; lint/typecheck geçer.

## Faz 2 — Wallet, Testnet ve USDC trustline

Yapılacaklar:

- Wallet adapter
- Connect/disconnect
- Public key ve network doğrulaması
- Account load/balance
- USDC trustline kontrolü
- Trustline oluşturma işlemi
- Pending/success/error UI

Kabul kriteri: Gerçek Testnet cüzdanı bağlanır; trustline zincir üzerinde açılır; explorer linki gösterilir.

## Faz 3 — Anchor discovery ve authentication

Yapılacaklar:

- Health check
- SEP-1 discovery
- Endpoint/issuer/signing key doğrulama
- SEP-10 challenge ve wallet signature
- JWT lifecycle
- SEP-6 info
- Typed error adapter

Kabul kriteri: Kullanıcı cüzdanıyla Anchor’a doğrulanır; info verisi UI’da görünür; secret frontend’de bulunmaz.

## Faz 4 — TRY → USDC Anchor deposit

Yapılacaklar:

- SEP-38 quote
- Quote expiry
- Amount validation
- SEP-6 deposit
- Banka talimatı
- Mock transfer simulation
- Status polling/recovery
- Transaction history

Kabul kriteri: 50–3.000 TRY arası demo deposit, gerçek Mock Anchor endpoint’lerinden geçerek `completed` olur ve USDC Testnet hesabına gelir.

Bu faz Anchor ağırlığı nedeniyle en yüksek önceliktedir. Soroban tamamlanmasa bile çalışan Anchor akışı korunmalıdır.

## Faz 5 — Soroban contract, test ve Testnet deploy

Yapılacaklar:

- Contract state/errors/events
- SAC USDC transferleri
- Auth/deadline mantığı
- Zorunlu testler
- Testnet deploy
- Contract ID config

Kabul kriteri: Tüm Rust testleri geçer; contract Testnet’te deploy edilmiştir; ID ve explorer kanıtı vardır.

## Faz 6 — Conditional Payment Intent uçtan uca entegrasyonu

Yapılacaklar:

- Institution create
- Student fund
- Approve/reject
- Timeout refund
- Role-aware actions
- Contract state read/sync
- Transaction feedback ve explorer linkleri

Kabul kriteri: En az bir tam approve akışı ve bir refund yolu gerçek Testnet işlemleriyle gösterilebilir.

## Faz 7 — UX durumları ve transaction evidence

Yapılacaklar:

- Loading/empty/error/success
- Refresh/retry/recovery
- Anchor + chain history ayrımı
- Mobile/accessibility
- Long wallet/hash overflow
- Confirmation modals

Kabul kriteri: Kullanıcı hangi işlemin nerede beklediğini ve ne yapması gerektiğini anlayabilir.

## Faz 8 — README, dokümantasyon ve pazar savunması

Yapılacaklar:

- Zorunlu README yapısı
- `ARCHITECTURE.md`
- `MARKET.md`
- `SECURITY_AND_LIMITATIONS.md`
- `DEMO.md`
- Gerçek screenshot ve testnet linkleri
- Hackathon mapping

Kabul kriteri: README tek başına projeyi, pazarı, Stellar gerekliliğini, çalışan kanıtları ve sınırları savunur.

## Faz 9 — Final QA ve teslim hazırlığı

Yapılacaklar:

- Clean install
- Lint
- Typecheck
- Unit/contract tests
- Production build
- Kritik smoke flow
- Secret scan
- Broken link/env kontrolü
- Mobil/desktop görsel kontrol
- Demo reset/recovery talimatı

Kabul kriteri: Tüm zorunlu kontroller geçer veya geçmeyenler açıkça belgelenir; canlı demo sahte veriye bağlı değildir.

## Faz 10 — Yalnızca zaman kalırsa

Öncelik sırası:

1. USDC → TRY withdraw
2. Basit Arrival Services QR ödeme örneği
3. Embedded/passkey wallet araştırması
4. Intent template registry taslağı
5. TypeScript SDK başlangıcı

Bu faz, Faz 0–9 tamamlanmadan başlatılmamalıdır.

---

# 14. Test ve kalite kapıları

Her fazda uygun olanları çalıştır:

```text
install
lint
typecheck
unit tests
contract tests
production build
```

Finalde ayrıca:

- Cüzdan yokken davranış
- Yanlış network
- Trustline yok
- Anchor JWT expired
- Quote expired
- Deposit pending/error
- Contract invalid state
- Institution olmayan wallet approve denemesi
- Deadline öncesi refund denemesi
- Deadline sonrası refund
- Uzun adreslerin responsive görünümü
- 320px/768px/1440px
- Keyboard/focus
- Sayfa refresh sonrası işlem recovery

kontrol edilmelidir.

Bir test geçmiyorsa sonucu saklama. “Çalışıyor” demeden önce komut çıktısını doğrula.

---

# 15. Onay noktası çıktı şablonu

Her faz sonunda tam olarak şu yapıya yakın bir özet ver:

```markdown
## Faz N tamamlandı

### Yapılanlar
- ...

### Değişen dosyalar
- `path/file.ts` — neden değişti

### Doğrulama
- `npm run lint` — geçti/kaldı
- `npm run typecheck` — geçti/kaldı
- ilgili test — sonuç

### Bilinen durumlar
- ...

### Sıradaki faz
- ...

Bu fazı onaylıyor musun? Onayından sonra Faz N+1’e geçeceğim.
```

Kullanıcıdan onay gelmeden devam etme.

---

# 16. Definition of Done

ArrivalPay MVP ancak aşağıdakilerin tümü doğruysa tamamlanmış sayılır:

- [ ] Cüzdan bağlantısı gerçek ve Testnet’tedir.
- [ ] USDC issuer doğru ve trustline akışı çalışır.
- [ ] SEP-1 discovery yapılır.
- [ ] SEP-10 wallet imzasıyla çalışır.
- [ ] SEP-38 quote gösterilir.
- [ ] SEP-6 deposit gerçek Mock Anchor çağrılarıyla tamamlanır.
- [ ] Anchor status polling ve hata durumları görünürdür.
- [ ] Soroban kontratı test edilmiştir.
- [ ] Kontrat Testnet’e deploy edilmiştir.
- [ ] Intent create/fund/approve/reject/timeout davranışları vardır.
- [ ] En az bir gerçek uçtan uca Testnet demo yolu vardır.
- [ ] UI `DESIGN.md` tokenlarına ve referans kilidine uyar.
- [ ] Mobil ve erişilebilirlik kontrolleri yapılmıştır.
- [ ] README pazarı kanıtlarla ve varsayımları etiketleyerek savunur.
- [ ] README Stellar’a sağlanan ağ etkisini açıklar.
- [ ] Mock/testnet/regülasyon sınırları dürüstçe açıklanır.
- [ ] Contract ID, transaction linkleri ve demo URL’si belgelenir.
- [ ] `.env.example` vardır; secret commit edilmemiştir.
- [ ] Lint, typecheck, test ve build sonuçları belgelenmiştir.
- [ ] Roadmap özellikleri çalışan özellik gibi sunulmamıştır.

---

# 17. Şimdi yapacağın ilk iş

Henüz kod yazma.

1. Repo durumunu incele.
2. `DESIGN.md` dosyasını tamamen oku.
3. Mevcut stack’i ve yeniden kullanılabilir kodu belirle.
4. Güvenlik ve entegrasyon risklerini çıkar.
5. Yukarıdaki fazları repo gerçekliğine uyarlayarak `IMPLEMENTATION_PLAN.md` oluştur.
6. İlk fazda değişecek dosyaları listele.
7. Hangi özelliklerin deadline riski oluşursa kesileceğini belirt.
8. Planı kısa bir özetle sun.
9. Kullanıcıdan onay iste ve dur.

Kod yazmaya ancak kullanıcı planı onayladıktan sonra başla.

