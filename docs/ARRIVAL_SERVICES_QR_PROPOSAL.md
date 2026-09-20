# Değerlendirilecek ek modül: Arrival Services QR ödemesi

Durum: **Plana dahil edildi.** Kullanıcı bu oturumda dar kapsamlı QR modülünü açıkça onayladı. `/arrival-services` üzerinde QR/link oluşturma, istek açma, doğrudan canonical Testnet USDC ödeme ve alıcı tarafında eşleşen ödemeyi kontrol etme uygulanıyor. TRY withdraw kapsam dışında. Aşağıdaki değerlendirme kararın tarihsel gerekçesidir.

## Fikrin kaynağı

Kullanıcının paylaştığı üç rollü model (Öğrenci / Üniversite / Sürücü) şunu öneriyor: öğrenci depozito sonrası aynı Stellar cüzdanını, henüz yerel nakit/kart/ulaşım kartı olmadığı için, bir sürücüye QR ile USDC ödemesi yapmak üzere kullanır. Sürücü paneli ödemeyi görür ve TR Mock Anchor üzerinden TRY'ye çevirir.

## Şartname ile ilişkisi

`ARRIVALPAY_DEVELOPMENT_PROMPT.md` §1'de bu senaryo açıkça **yol haritası** maddesi olarak listelenmiştir ("Arrival Services/ulaşım QR ödemeleri") ve aynı bölüm "Bu gelecekteki özellikleri MVP'ye doldurma" der. MVP tek intent türü olan `ENROLLMENT_DEPOSIT` ile sınırlıdır. Bu modül, mevcut MVP tanımının bir parçası değil, ondan ayrı bir uzantıdır.

## Kapsam ayrımı: ucuz kısım vs. pahalı kısım

| Alt özellik | Maliyet | Gerekçe |
|---|---|---|
| Öğrenci → sürücü QR ile doğrudan USDC ödemesi | Düşük | Faz 2'de kurulu cüzdan bağlantısı, işlem hazırlama/imzalama altyapısı (`src/services/stellar`, `src/features/wallet`) yeniden kullanılabilir. Soroban kontratına veya Anchor'a dokunmaz; düz bir Stellar payment operasyonu ve QR üret/oku kütüphanesi yeterli. |
| Sürücünün USDC'yi TRY'ye çevirmesi (Anchor withdraw) | Yüksek | Ayrı bir SEP-6 withdraw akışı (`account_id`/`memo`/`memo_type` eşleşmesi) gerektirir. Bu, Faz 3-4'te kurulacak deposit yönünden bağımsız, ikinci bir Anchor entegrasyon yüzeyidir. |

## Hackathon değerlendirme kriterleri açısından

- **Lehte:** İkinci gerçek bir zincir kullanım alanı gösterir; "reusable wallet" ve ağ etkisi anlatısını (§2) somutlaştırır. Traction & Continuity ve User Experience kriterlerine katkı sağlayabilir.
- **Riskli:** Jüri Anchor/local-payment entegrasyonunu ve "mocked olmayan uçtan uca çalışan sistem"i (Technical Implementation) daha ağır puanlıyor. Bu modül, asıl puanlanan Faz 3-6 çekirdeğinden (Anchor deposit + Soroban conditional intent) zaman ve dikkat çeker.

## Önerilen çerçeve (yalnızca karar anında değerlendirilecek)

Eğer ileride eklenmesine karar verilirse:

1. Yalnızca öğrenci → sürücü doğrudan USDC ödemesi eklenir; withdraw (TRY'ye çevirme) roadmap'te kalır.
2. Bağımsız bir `src/features/arrival-services/*` modülü olarak izole edilir; mevcut `intents` ve `anchor` (deposit) modüllerine dokunmaz.
3. Yalnızca Faz 0–9 (ENROLLMENT_DEPOSIT çekirdeği, Anchor deposit, Soroban kontrat, uçtan uca akış, README) tamamlandıktan ve gerçek zaman payı doğrulandıktan sonra başlatılır.
4. Sürücü, aldığı USDC'yi kendi cüzdanında tutar; "gelecekte Anchor withdraw ile TRY'ye çevrilebilir" notu README roadmap'inde belirtilir, çalışan özellik gibi sunulmaz.

## Açık karar noktası

Bu modülün MVP'ye dahil edilip edilmeyeceği, tüm zorunlu fazlar bittikten sonra kullanıcı tarafından değerlendirilecektir. Bu belge o karara temel oluşturur; kendiliğinden bir taahhüt veya plan güncellemesi değildir.
