# ArrivalPay — Sunum çalışma notları

Bu dosya her tamamlanan fazda güncellenecek. Ürün hedefi ile bugün gösterilebilen özellikler ayrı anlatılacak.

## Proje nedir?

ArrivalPay, uluslararası öğrencilerin kayıt depozitoları için koşullu ödeme altyapısıdır. Kurum tutarı, öğrenciyi ve karar süresini belirler. Öğrenci yerel para ile USDC edinir ve ödemeyi kontrata yatırır. Kurum kabul ederse fon kuruma aktarılır; reddederse öğrenciye iade edilir. Süre dolarsa öğrenci iade talep edebilir.

Bu, hedeflenen ürün akışıdır. Faz 2 itibarıyla cüzdan bağlantısı, bakiye okuma ve USDC trustline kodu hazır; Anchor deposit ve koşullu ödeme henüz uygulanmadı. Gerçek Testnet trustline kanıtı geçici test hesabına aittir; kullanıcının Freighter onayı ayrı kontrol edilir.

## 30 saniyelik anlatım

“Yurt dışında okumaya hazırlanan bir öğrenci, kayıt depozitosunu gönderirken yalnızca paranın ulaşmasını değil, kabul ya da ret durumunda ne olacağını da bilmek ister. ArrivalPay, ödeme tutarını ve iade koşullarını tek bir talepte toplar. Hedefimiz, öğrencinin TRY ile fonlayabildiği ve USDC'nin kurum kararı ya da süre koşuluna göre hareket ettiği bir Stellar uygulaması geliştirmek. Arayüzü ve cüzdan bağlantısını kurduk; geçici bir test hesabıyla USDC trustline işlemini Stellar Testnet üzerinde doğruladık.”

## Üç teknik kavramı basit anlat

| Kavram | Sunumda anlamı |
|---|---|
| Anchor | Yerel para ile zincirdeki bakiye arasında giriş/çıkış noktası. Demo sağlayıcımız gerçek banka işlemi yapmaz. |
| USDC cüzdanı | Öğrencinin ödeme ve iade bakiyesini taşıyacağı cüzdan. Testnet varlıkları gerçek para değildir. |
| Soroban kontratı | Ödeme koşullarını ve kimin hangi işlemi yapabileceğini uygulayacak program. Kurumun kararının gerçekliğini kendisi doğrulamaz. |

## Faz 1 — Ne yaptık, neden gerekli?

- Next.js + TypeScript altyapısı: sayfaların ve ilerideki cüzdan/ödeme özelliklerinin ortak temeli.
- Merkezi tasarım tokenları: tutar, durum ve aksiyonlar her sayfada tutarlı görünecek.
- Ana sayfa: problem, hedef akış ve Stellar'ın üç rolü.
- Öğrenci alanı: ileride bakiye ve kendisine atanmış depozitoları gösterecek ekran.
- Kurum alanı: talebin öğrenci, tutar ve deadline alanlarını gösteren pasif önizleme.
- İşlem geçmişi ve ödeme detay sayfası: ileride gerçek kayıt ve explorer kanıtlarının bulunacağı yer.
- Testnet yapılandırması: yanlış ağ/endpoint değerleri sessizce kabul edilmez.

## Bu fazın ekran turu — yaklaşık 1 dakika

1. Ana sayfayı aç: “Bir kayıt ödemesini tekrar kullanılabilir bir Stellar cüzdanının başlangıcına dönüştürüyoruz.”
2. Sağdaki kartları göster: “Bunlar ürün yolculuğunun açıkça etiketlenmiş örnek durumları; canlı işlem sonucu değil.”
3. Student sayfasını aç: “Öğrenci koşulları ve bakiyeyi buradan takip edecek. Şu an cüzdan bağlı olmadığı için gerçekmiş gibi sıfır bakiye veya işlem göstermiyoruz.”
4. Institution sayfasını aç: “Koşulları kurum belirliyor. Kabul ve ret kararları yetkili kurum cüzdanından gelecek.”
5. Activity sayfasını aç: “Yerel fonlama ile zincir işlemlerinin kayıtları burada ayrı kaynak etiketleriyle izlenecek.”

## Sorulabilecek sorular

**Neden yalnızca normal bir para transferi değil?** Ödemenin yanında serbest bırakma ve iade koşullarını da görünür ve uygulanabilir hale getirmeyi hedefliyoruz.

**Kurum yanlış karar verirse kontrat bunu anlar mı?** Hayır. Kontrat kararın gerçek dünyada doğruluğunu doğrulamaz; yetkili kararın ödeme kurallarına uygun uygulanmasını sağlar.

**İade otomatik mi?** Ret kararında kontrat iade transferini uygular. Zaman aşımında öğrenci iade talep işlemi yapar; kendiliğinden çalışan bir zamanlayıcı vaat etmiyoruz.

**Şu an ne çalışıyor?** Sayfalar, Freighter bağlantı kodu, Testnet hesap/bakiye okuma, USDC trustline hazırlama-imzalama-gönderme akışı. Otomatik tarayıcı testleri cüzdan yanıtlarını fixture ile verir. Gerçek zincir testimiz ayrıca geçici bir Node test hesabıyla yapıldı. TRY/USDC dönüşümü ve escrow sonraki fazların işidir.

**Neden Testnet?** Prototipi gerçek para taşımadan sınamak için. Mock Anchor üzerinden banka transferi ve KYC simülasyondur.

## Sıradaki fazın anlatımı

Faz 2, arayüzü gerçek Testnet cüzdanına bağlayacak: public key, XLM/USDC bakiyesi ve USDC kabulü için trustline. Bu adım tamamlandığında gerçek hesap ve işlem kanıtını gösterebileceğiz; yalnızca doğrulanan sonuçları sunacağız.


## Faz 2 — Öğrencinin cüzdanını ödemeye hazırla

### Ne yaptık?

- Freighter browser extension bağlantısı için Stellar Wallets Kit 2.6.0 adaptörü eklendi.
- XLM ve doğru issuer'a ait USDC bakiyesi Testnet Horizon'dan okunuyor.
- Hesap yoksa Friendbot test fonu bağlantısı gösteriliyor; sahte sıfır bakiye üretilmiyor.
- USDC trustline yoksa kullanıcı önce rezervi, maksimum ücreti ve ihraççı adresini görüyor.
- İmza Freighter'dan isteniyor; farklı işlem gövdesi veya yanlış imza kabul edilmiyor.
- Zincir sonucu confirmed/pending/failed olarak ayrılıyor. Belirsiz sonuçta hash saklanıp sorgulanıyor; çift işlem üretilmiyor.
- Hesap/ağ değişikliği bağlantıyı geçersiz kılıyor; eski hesabın işlemi gönderilmiyor.

### 20 saniyelik faz anlatımı

“Bu aşamada öğrencinin Stellar hesabını USDC alabilir hale getiriyoruz. Uygulama bakiyeyi okuyor ve gerekli trustline işlemini hazırlıyor. Anahtar kullanıcıda kalıyor; imzayı cüzdan veriyor. Hazırlanan trustline işlemini gerçek Testnet'te geçici bir test hesabıyla doğruladık.”

### Trustline ne demek?

“Bu hesabın belirli bir ihraççının USDC'sini kabul etmesine izin veren bir kayıt.” USDC satın almak veya üniversiteye depozito göndermek değildir. Aynı USDC adı başka tokenlarda da kullanılabilir; bu yüzden kod ve issuer birlikte kontrol edilir.

### Gösterilebilecek kanıt ve sınırı

- Gerçek zincir kanıtı: [Testnet trustline işlemi](https://stellar.expert/explorer/testnet/tx/ce9a94b9789e9da01f9aa183518e2a4e41e8bb6aebd6e83b4dc457614b94c333).
- Bu testte USDC bakiyesi 0; erişim authorized. Yalnızca trustline açıldı.
- İşlem geçici test hesabından Node ortamında imzalandı. Kullanıcının Freighter cüzdanıyla tamamlanmış işlem olarak sunulmaz.
- Otomatik tarayıcı görüntüleri fixture hesaplarına aittir; canlı zincir kanıtıyla karıştırılmaz.

### Kendi cüzdanınla ekran turu

1. Freighter browser extension içinde Testnet seç.
2. `/student` sayfasında Connect Freighter de ve bağlantıyı cüzdanda onayla.
3. XLM/USDC bilgilerini göster. Hesap yoksa Get test XLM bağlantısını kullanıp Refresh status de.
4. USDC access “Not enabled” ise Enable USDC de. Rezerv ile ağ ücretinin farkını açıkla.
5. Sign with Freighter ile işlemi cüzdanda incele. Onay sonrası sonucu ve explorer bağlantısını göster.
6. Hesapta zaten doğru USDC trustline'ı varsa yeniden işlem gerekmez; Active durumu gösterilir.

Özel anahtar veya kurtarma kelimeleri hiçbir aşamada ArrivalPay'e girilmez.

### Rezerv ve ücret farkı

Bu doğrulamadaki ek rezerv 0.5 XLM, ağ ücreti 0.00001 XLM idi. Uygulama bu değerleri ağdan alır; sabit fiyat vaadi değildir. Rezerv hesapta tutulur, ağ ücreti harcanır.

### Sırada ne var?

Faz 3: Anchor'ın kimliğini/endpoint'lerini keşfetmek ve SEP-10 ile cüzdan sahipliğini doğrulamak. Faz 4: gerçek Mock Anchor API'siyle TRY → Testnet USDC deposit. Henüz gerçek banka transferi yapılmıyor.
