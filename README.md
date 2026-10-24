
# App Security Learning

Güvenli web ve mobil uygulama geliştirmeyi öğrenmek için hazırlanmış
eğitim projesi.

## Hedefler

- Tehdit modellemesi
- Kimlik doğrulama ve sunucu tarafı yetkilendirme
- Kullanıcıların özel verilerini koruma
- Web ve mobil istemcileri aynı API'ye bağlama
- Otomatik güvenlik testleri

## Teknoloji yığını

- Node.js ve TypeScript
- Express ve Zod
- SQLite
- Argon2id ve kısa ömürlü JWT
- React ve Vite
- Expo ve React Native
- Vitest ve Supertest

## Klasörler

- `notes/`: Tehdit modeli
- `api/`: API sunucusu ve güvenlik testleri
- `web-app/`: Web istemcisi
- `mobile-app/`: Mobil istemci

## Ön koşullar

- Güncel Node.js LTS ve npm
- Git
- VS Code
- Web geliştirme için modern tarayıcı


## API kurulumu

1. `api/.env.example` dosyasını `.env` olarak kopyalayın.
2. `JWT_SECRET` için en az 32 karakterlik rastgele bir değer üretin.
3. API klasöründe paketleri kurun:

   `npm install`

4. TypeScript kontrolünü ve testleri çalıştırın:

   `npm run typecheck`

   `npm test`

5. Geliştirme sunucusunu başlatın:

   `npm run dev`

API sağlık kontrolü:

`http://127.0.0.1:3001/api/health`

## Web istemcisi

1. `web-app/.env.example` dosyasını `.env` olarak kopyalayın.
2. API adresini kontrol edin.
3. `web-app/` klasöründe `npm install` çalıştırın.
4. `npm run dev` ile uygulamayı başlatın.
5. Vite'ın gösterdiği yerel adresi açın.


Fiziksel cihaz için API'nin yerel ağdan erişilebilir olması gerekir.
Güvenlik duvarını ve API'nin dinlediği adresi kontrol edin.

## Güvenlik ilkeleri

- Parolalar düz metin saklanmaz.
- API girdileri sunucuda doğrulanır.
- Özel notlara erişimde sahiplik denetlenir.
- Genel profil yanıtı e-posta adresini içermez.
- Yerel sırlar ve veritabanı dosyaları Git'e eklenmez.
- Hatalar istemciye gizli sistem ayrıntıları döndürmez.

## Testler

API klasöründe:

- `npm run typecheck`
- `npm test`
- `npm audit`

Web klasöründe:

- `npm run build`
- `npm run lint`
- `npm audit`

## Güvenlik sınırları

Bu proje eğitim amaçlıdır; üretim için hazır bir sistem olarak
değerlendirilmemelidir. Üretim öncesinde HTTPS, güvenli anahtar
yönetimi, token yenileme ve iptali, hesap kurtarma, izleme,
yedekleme, gizlilik ve bağımsız güvenlik incelemesi gerekir.

Testlerde gerçek kullanıcı verileri veya üretim sırları kullanmayın.
