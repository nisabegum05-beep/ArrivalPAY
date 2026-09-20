# ArrivalPay tasarım kararları

Tarih: 20 Eylül 2026. Faz 0 referans kilidi; Faz 1 uygulandı ve render üzerinden kontrol edildi.

## Brief ve araştırma

Uluslararası öğrenciler ve kurum görevlileri için responsive web. Ana hedef: koşulları anlayıp kayıt depozitosunu fonlamak ve paranın durumunu takip etmek. Görsel yön: kullanıcının Huddle referansı; sakin, belge/katalog düzeni. Ayırt edici ürün öğesi: aynı intent'in koşulları ve para hareketinin okunabilir zaman çizgisi.

DESIGN.md tamamen okundu. Refero canlı `Huddle flat editorial pastel inventory cards` araması NO_SUBSCRIPTION döndürdü; canlı stil/screen/flow incelendiği iddia edilmiyor. Alternatif kaynak olarak yerel Refero `references/craft-details.md` okundu. Uygulama aşamasında bu kilide göre ekran ve erişilebilirlik kontrolü yapılacak.

## Karar defteri

| Karar | Kaynak ve rol | Uygulama |
|---|---|---|
| Beyaz #ffffff canvas | DESIGN tokens ve Do's | Krem/off-white giriş açıklamasına rağmen açık token değeri korunur |
| Hafif büyük sans | DESIGN Typography + şartname §11 | Inter 300–400 display; mono yalnız adres/hash/timestamp; en çok 2 aile |
| Ana CTA #65451d | DESIGN Agent Prompt Guide + şartname §11 | Eski Primary Pill Button paragrafındaki siyah yerine ArrivalPay'e özgü burnt amber |
| Sage #d3e5e9 | Şartname §11 açık uyarlama | Ready/funded/trustline-active yüzeyi ve uygun border; yalnız dekorasyon değil |
| Lavender #bbb2ce | Şartname §11 | Awaiting/processing |
| Rose #cb9da2 | Şartname §11 açık uyarlama | Rejected/refund-pending/attention; Huddle shipped eşlemesi burada kullanılmaz |
| Burgundy #5c2529 | Şartname §11 | Gerçek error/destructive durumları |
| Violet #453b60 | DESIGN token rolü | Link ve outlined action; genel marka dolgusu olmaz |
| Gold #e4b976 | DESIGN token rolü | Küçük tag/highlight; büyük yüzey yok; kontrast geçmezse amber metin |
| Flat hairline yüzeyler | DESIGN Elevation | 1px border; box-shadow ve gradient yok |
| Radius hiyerarşisi | DESIGN Radius Vocabulary | Badge 4, card 8, list 24, hero 40, secondary 100, primary 1000 px |
| 1200px max width | DESIGN Layout | Yaklaşık 64px section gap, 24px card padding, 12px element gap |
| Ürün durumları ana görsel | Şartname §10–11 | Asimetrik hero, status kartları; gerçek veri yoksa örnek olduğu açık veya empty state |
| Liste ve divider dashboard | Şartname §11 | Salt metin gruplarını kartlaştırma; tutar/koşul/aksiyon öncelikli |
| Akış mantığı | Şartname §9–10 | Auth sonra locked quote; pending → recovery; Anchor completed escrow funded değildir |
| Form ve klavye | Refero craft-details | Görünür label, focus-visible outline, aria-describedby, aria-live, modal focus dönüşü |

## Korunan sınırlar

Pastel üstünde koyu metin; body sola hizalı ve yaklaşık 65ch. Başlıklar balance, açıklamalar gerektiğinde pretty. Sayılar tabular; kopyalanabilir tam adres ve görsel kısaltma birlikte. Renk tek durum göstergesi olamaz. 44px dokunma alanı, reduced-motion, 320/768/1440px kontrolü.

Referanstaki avatar/testimonial öğeleri gerçek içerik olmadığı için eklenmez. Sahte sosyal kanıt, anlamsız KPI, emoji, neon, glassmorphism, 3D/stock görsel, dekoratif blockchain, serif/italic hero kelimesi yok. Görseller kodla üretilen gerçek UI öğeleridir; image generation gerekmiyor.

Mist gray gibi açık tonlar body metnine otomatik uygulanmaz; AA kontrastı ölçülür. Focus için gölge yerine outline kullanılarak shadowsuz sistem korunur. Ödeme miktarları yuvarlanmış sunumla imzalanan gerçek miktarı gizlemez.

## Faz 1 görsel kabulü

Route shell'leri aynı tipografi, navigasyon, token ve Testnet etiketini kullanır. Responsive overflow ve focus gözle kontrol edilir. Referans kilidiyle render karşılaştırması yapılmadan tasarım tamamlandı sayılmaz.

## Kullanılan tasarım kaynakları

- Kullanıcı kaynağı: DESIGN.md ve ARRIVALPAY_DEVELOPMENT_PROMPT.md §10–11.
- Refero skill: `/Users/nisabegumerkilic/.codex/plugins/cache/openai-curated-remote/app-6a72258e6f18819183e5c4d8a56b78d9/1.0.2/skills/refero-design/SKILL.md`.
- Aynı skill dizinindeki `references/craft-details.md` yalnız erişilebilirlik ve etkileşim detayları için kullanıldı.

## Faz 1 görsel kontrolü

- Kaynak: yukarıdaki onaylı referans kilidi. Kanıt: `docs/screenshots/phase-1-*.png` gerçek uygulama ekranlarıdır.
- Ana sayfa desktop/mobile ve kurum tablet ekranı gözle incelendi. Beş ana route 320/768/1440 px tarayıcı kontrolünden geçti; yatay taşma yok.
- Beyaz canvas, amber CTA, hafif Inter başlık, hairline border ve pastel durum yüzeyleri korundu. Görsel QA sonrası başlık tracking -0.021em yapıldı; kart açıklamaları 14px'e, durum etiketleri 12px'e çıkarıldı.
- Araçla WCAG A/AA taramasında ihlal bulunmadı. Bu sonuç tam erişilebilirlik sertifikası değildir.
- Örnek yolculuk açıkça Illustration etiketli; gerçek veri olmadan wallet/transaction state üretilmez.
- Sonuç: incelenen ekranlarda açık P0/P1/P2 görsel sorun bulunmadı.

## Faz 2 görsel kontrolü

Mevcut referans kilidi korundu. Cüzdan paneli sage yüzey, amber işlem düğmesi, hairline ayırıcılar ve tam kopyalanabilir adres kullanıyor. Mobilde panel depozito listesinden önce geliyor. İşlem penceresi açılınca açıklama başlığına odaklanıyor; 320 px'de içerik pencere içinde kaydırılıyor. Ücret ile hesapta tutulan rezerv ayrı açıklanıyor.

Son production testlerinden desktop cüzdan ve mobil işlem penceresi gözle incelendi; 27 tarayıcı testi geçti. `docs/screenshots/phase-2-*-fixture-*.png` görsellerinde wallet/Horizon test verileri vardır; canlı cüzdan kanıtı değildir.

## Final release — existing UI and monochrome brand

Build target: existing ArrivalPay layouts, updated for the user's near-black visual reference. Pending a clarified palette, use white canvas, near-black text and primary actions, neutral gray panels and explicit text status labels. Preserve Inter, mono amounts, thin dividers, spacious two-column composition and mobile stacking. Refero live search returned NO_SUBSCRIPTION; existing DESIGN.md and bundled icons/visual-workflow references remain the design evidence.

| Decision | Source | Role | Reason |
|---|---|---|---|
| Black/white/gray palette | User image, provisionally interpreted | Brand and surfaces | Matches visible reference without inventing unseen hues |
| Geometric A with arrival arrow | ArrivalPay name and reusable-wallet journey | Editable SVG identity | Scales from favicon to navigation; no raster artwork needed |
| Existing layout/type scale | DESIGN.md and current implementation | Product continuity | Keeps the verified responsive structure |
| Native review dialog | Existing trustline interaction and craft guidance | Financial action confirmation | Makes amount, recipient and effect readable before wallet signing |

## Final palette — invoicing-dashboard direction (supersedes the black/white/gray entry above)

User gave an explicit, final 3-color spec and a structural reference ("Syllabus" style guide) for a bill-payment/invoicing feel, matching the mentor's "make it feel like paying a bill" note. This replaces the provisional monochrome entry above — that one was applied without the user confirming the 2-3 options the process was supposed to present first; this one is a direct, explicit instruction, taken as final.

| Token role | Color | Hex | Source |
|---|---|---|---|
| Background/surface (~60%) | Slate Off-White | `#F8FAFC` | User spec |
| Structure/text (~30%) | Deep Navy | `#0F172A` | User spec |
| Action/accent (~10%) | Emerald / Tech Teal | `#0D9488` | User spec |

Applied by redefining the *existing* token values in `src/app/globals.css` (`--color-paper-white`, `--color-ink-black`, `--color-burnt-amber`, etc.) rather than renaming them — every rule in the file already reads colors through `var(--color-x)`, so this recolors the whole app from one block, without touching component markup or logic.

Structural choices taken from the Syllabus reference, applied narrowly:
- All radii set to `0px` (cards, buttons, tags, inputs) — sharp, ledger-like corners. `.status-dot` keeps an explicit `border-radius: 50%` override so the small status indicator stays a dot.
- A hard-offset shadow (`1px 1px 3px rgba(15,23,42,.9)`), applied *only* to `.button--primary` — the one "pressable artifact" the reference calls out, not used anywhere else.

Accessibility fix made during implementation, verified with axe rather than assumed: `#0D9488` text on the `#F8FAFC` canvas is 3.58:1 (fails WCAG AA, needs 4.5:1). Kept the user's exact teal for large fills (button/skip-link backgrounds) paired with Deep Navy text — `#0F172A` on `#0D9488` is 4.77:1, passes — and introduced a darker teal (`#0F766E`, 5.23:1 on the canvas) reusing the existing `--color-honey-gold` token for every place teal is used as *text* on the light canvas (nav active/hover, tag--accent, roadmap tags, wordmark dot). All axe checks in `tests/e2e/*` pass at 320/768/1440px after this change.
