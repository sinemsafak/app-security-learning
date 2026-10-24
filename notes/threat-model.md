
# Threat Model — App Security Learning

## 1. Proje kapsamı

Bu proje, profil ve özel not özelliklerine sahip bir öğrenme uygulamasıdır.

Korunan varlıklar:
- Kullanıcı hesapları
- Parola hashleri
- E-posta adresleri
- Özel notlar
- Oturum veya erişim tokenları
- Veritabanı ve yapılandırma sırları

Tehdit aktörleri:
- Kimliği doğrulanmamış ziyaretçiler
- Kendi yetkilerini aşmaya çalışan kullanıcılar
- Başka kullanıcıların kayıt kimliklerini tahmin eden saldırganlar
- Yanlış yapılandırılmış istemciler veya sunucu bileşenleri

Bu model eğitim kapsamındadır; gerçek üretim sisteminin güvenlik
incelemesinin yerini tutmaz.

## 2. Kullanıcı arayüzü

### Gördüğü veriler
- Giriş formundaki e-posta ve parola
- Kullanıcının izin verilen profil alanları
- Kullanıcının kendi özel notları
- API'den dönen hata ve durum mesajları

### Riskler
- XSS veya güvensiz HTML gösterimi
- Hassas verilerin tarayıcı depolamasına yazılması
- API yanıtlarında gereğinden fazla alan bulunması
- Arayüzde gizlenen alanların yine de API üzerinden alınabilmesi
- Tokenların loglara veya URL'lere sızması

### Önlemler
- Güvenli çıktı kodlama ve React'in varsayılan metin gösterimini kullanma
- Gereksiz HTML enjeksiyonundan kaçınma
- Hassas verileri URL'lere ve loglara koymama
- Arayüz gizliliğini gerçek yetkilendirme olarak kabul etmeme
- Yalnızca gerekli alanları görüntüleme

## 3. API

### Gördüğü veriler
- HTTP istekleri ve doğrulanmış girdiler
- Kimliği doğrulanmış kullanıcı kimliği
- Profil ve özel not kayıtları
- Kimlik doğrulama başlıkları veya oturum bilgileri

### Riskler
- IDOR/BOLA: başka bir kullanıcının kaydına erişim
- Eksik kimlik doğrulama veya yetkilendirme
- SQL enjeksiyonu
- Hatalı veya aşırı büyük girdiler
- Kaba kuvvetle parola denemeleri
- Hassas hata mesajları ve loglar
- Aşırı izin veren CORS yapılandırması

### Önlemler
- Her özel istekte kimlik doğrulama
- Kaynak sahipliğini sunucuda kontrol etme
- Parametreli SQL sorguları kullanma
- Zod ile girdi doğrulama
- İstek boyutu sınırı ve hız sınırlaması
- Helmet ile güvenlik başlıkları
- Genel hata mesajları ve gizli bilgileri dışarıda bırakan loglar
- İzin verilen istemci kaynaklarını açıkça yapılandırma

## 4. Kimlik doğrulama sistemi

### Gördüğü veriler
- Kayıt ve giriş sırasında e-posta ve parola
- Parola hashleri
- Token doğrulama bilgileri
- Token içindeki kullanıcı kimliği ve süre bilgileri

### Riskler
- Düz metin parola saklama
- Zayıf parola hashleme
- Token çalınması
- Süresi dolmayan erişim tokenları
- Kaba kuvvet saldırıları
- Tokenların yanlışlıkla loglanması

### Önlemler
- Parolaları Argon2id ile hashleme
- Parolaları geri çözülebilir biçimde saklamama
- Kısa ömürlü erişim tokenları kullanma
- Tokenları URL'ye koymama
- Giriş denemelerini hız sınırlamasına tabi tutma
- Web ve mobil istemcide token saklama risklerini ayrı değerlendirme
- Gerçek sırları ortam değişkenlerinde tutma

## 5. Veritabanı

### Gördüğü veriler
- Kullanıcı kimlikleri ve e-posta adresleri
- Parola hashleri
- Profil alanları
- Özel notlar ve sahiplik ilişkileri

### Riskler
- Yetkisiz veritabanı erişimi
- SQL enjeksiyonu
- Yanlış sahiplik sorguları
- Yerel veritabanı dosyasının sızması
- Yedeklerin veya günlüklerin hassas bilgi içermesi

### Önlemler
- Parametreli sorgular
- Benzersiz kullanıcı kimliği ve e-posta kısıtları
- Her özel kaydı sahibiyle ilişkilendirme
- Veritabanı dosyasını Git dışında tutma
- En az ayrıcalık ilkesi ve uygun dosya izinleri
- Yedekleri ve üretim depolamasını ayrıca koruma

## 6. Hassas kullanıcı verileri

### Veriler
- E-posta adresleri
- Parola hashleri
- Özel notların içeriği
- Kimlik doğrulama tokenları

### Riskler
- Bir kullanıcının diğerinin özel notlarını okuması
- E-posta adreslerinin herkese açık profil yanıtına eklenmesi
- Verilerin istemci loglarına veya hata yanıtlarına sızması
- Yetkisiz güncelleme veya silme

### Önlemler
- Genel profil alanları ile özel alanları ayırma
- E-posta adresini yalnızca sahibine gösterme
- Özel not sorgularını kullanıcı kimliğiyle sınırlandırma
- Her güncelleme ve silmede sahiplik denetimi
- Hassas verileri testlerde sahte değerlerle temsil etme

## 7. Güven sınırları

1. Tarayıcı ve mobil istemci güvenilmeyen istemcilerdir.
2. İstemciden gelen kullanıcı kimliği ve kayıt kimliği doğrulanmalıdır.
3. API, doğrulanmış kimlikten kullanıcı bağlamı üretir.
4. Veritabanına erişim API katmanı üzerinden gerçekleşir.
5. Yerel .env dosyaları ve veritabanı dosyaları Git'e eklenmez.

## 8. Saldırı senaryoları

### Senaryo A — Başka kullanıcının notunu okuma

Saldırgan kendi notunun kimliğini başka bir notun kimliğiyle
değiştirir.

Kontrol:
- Token doğrulanır.
- Not, token içindeki kullanıcı kimliğiyle sorgulanır.
- Kayıt bu kullanıcıya ait değilse içerik döndürülmez.

### Senaryo B — E-posta adresini sızdırma

Saldırgan başka bir kullanıcının profil uç noktasını çağırır.

Kontrol:
- Genel profil yanıtı yalnızca herkese açık alanları içerir.
- E-posta adresi yalnızca sahibinin kimlik doğrulamalı yanıtında
  bulunur.

### Senaryo C — Toplu alan güncellemesi

Saldırgan isteğe role, userId veya başka bir korumalı alan ekler.

Kontrol:
- İstek şeması izin verilen alanları belirler.
- Sunucu, kullanıcı tarafından değiştirilebilecek alanları açıkça
  seçer.
- İstemciden gelen sahiplik bilgisi kullanılmaz.

## 9. Güvenlik doğrulama planı

- Kimlik doğrulamasız özel isteğin reddedilmesi
- Yanlış parolanın reddedilmesi
- Kullanıcının kendi notuna erişebilmesi
- Başka kullanıcının notuna erişimin engellenmesi
- Başka kullanıcının notunun güncellenememesi ve silinememesi
- Genel profil yanıtında e-posta bulunmaması
- Geçersiz girdilerin reddedilmesi
- Parolaların düz metin tutulmaması
- Hata yanıtlarının sır veya yığın izi içermemesi
- Bağımlılık ve derleme denetimlerinin yapılması

## 10. Bilinen sınırlamalar

Bu proje eğitim amaçlıdır. Üretim ortamı için ayrıca güvenli
dağıtım, TLS, anahtar yönetimi, yedekleme, izleme, hesap kurtarma,
oturum iptali, veri saklama politikası, gizlilik değerlendirmesi ve
bağımsız güvenlik incelemesi gerekir.
