const crypto = require('crypto');

/**
 * ArrayBuffer'ı Base64URL string'e çevirir
 * @param {Buffer} buffer - Çevrilecek buffer
 * @returns {string} Base64URL formatında string
 */
function bufferToBase64Url(buffer) {
  const base64 = buffer.toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * PEM formatındaki anahtardan base64 kısmını çıkarır
 * @param {string} pem - PEM formatında anahtar
 * @param {string} type - Anahtar tipi ('PUBLIC' veya 'PRIVATE')
 * @returns {Buffer} Base64 decode edilmiş buffer
 */
function extractKeyFromPem(pem, type) {
  const header = `-----BEGIN ${type} KEY-----`;
  const footer = `-----END ${type} KEY-----`;
  
  const base64Key = pem
    .replace(header, '')
    .replace(footer, '')
    .replace(/\s+/g, ''); // Tüm whitespace karakterlerini kaldır
  
  return Buffer.from(base64Key, 'base64');
}

/**
 * VAPID anahtarlarını oluşturur
 * @returns {Promise<{publicKey: string, privateKey: string, subject: string}>}
 */
async function generateVAPIDKeys() {
  try {
    console.log('🔄 VAPID anahtarları oluşturuluyor...\n');

    // ECDSA P-256 anahtar çiftini oluştur
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // P-256 için alternatif isim (daha uyumlu)
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Public key işleme
    const publicKeyBuffer = extractKeyFromPem(publicKey, 'PUBLIC');
    
    // SPKI formatında P-256 public key yapısı:
    // - İlk 26 bayt: ASN.1 header ve algorithm identifier
    // - Sonraki 65 bayt: Uncompressed public key (0x04 + 32 bayt X + 32 bayt Y)
    if (publicKeyBuffer.length < 91) {
      throw new Error(`Public key buffer çok kısa: ${publicKeyBuffer.length} bayt`);
    }

    const rawPublicKey = publicKeyBuffer.slice(26, 91); // 65 baytlık ham public key
    
    // İlk baytın 0x04 olduğunu kontrol et (uncompressed format)
    if (rawPublicKey[0] !== 0x04) {
      throw new Error('Public key uncompressed format değil');
    }

    const vapidPublicKey = bufferToBase64Url(rawPublicKey);

    // Private key işleme
    const privateKeyBuffer = extractKeyFromPem(privateKey, 'PRIVATE');
    const vapidPrivateKey = bufferToBase64Url(privateKeyBuffer);

    const result = {
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
      subject: 'mailto:your-email@example.com' // Bunu değiştirmeyi unutmayın
    };

    // Sonuçları göster
    console.log('✅ VAPID anahtarları başarıyla oluşturuldu!\n');
    console.log('📝 VAPID Public Key:');
    console.log(vapidPublicKey);
    console.log('\n🔒 VAPID Private Key:');
    console.log(vapidPrivateKey);
    console.log('\n🌐 Subject (örnek):');
    console.log('mailto:your-email@example.com');
    
    console.log('\n📄 JSON Format:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n📊 Anahtar Bilgileri:');
    console.log(`- Public Key Uzunluğu: ${rawPublicKey.length} bayt`);
    console.log(`- Private Key Buffer Uzunluğu: ${privateKeyBuffer.length} bayt`);
    console.log(`- Public Key Base64URL Uzunluğu: ${vapidPublicKey.length} karakter`);
    console.log(`- Private Key Base64URL Uzunluğu: ${vapidPrivateKey.length} karakter`);

    console.log('\n⚠️  Önemli Notlar:');
    console.log('1. Subject değerini kendi email adresiniz veya web sitenizle değiştirin');
    console.log('2. Private key\'i güvenli bir yerde saklayın');
    console.log('3. Bu anahtarları web push servisinizde kullanabilirsiniz');

    return result;

  } catch (error) {
    console.error('❌ VAPID anahtarları oluşturulurken hata:', error);
    console.error('Hata kodu:', error.code);
    console.error('Mesaj:', error.message);
    console.error('Stack:', error.stack);
    
    // Hata durumunda troubleshooting önerileri
    console.log('\n💡 Troubleshooting:');
    console.log('1. Node.js versiyonunuz 12+ olduğundan emin olun');
    console.log('2. Crypto modülünün mevcut olduğunu kontrol edin');
    console.log('3. Sistem kaynaklarının yeterli olduğunu kontrol edin');
    
    throw error;
  }
}

/**
 * Anahtarların geçerliliğini test eder
 * @param {Object} keys - Test edilecek anahtarlar
 * @returns {boolean} Test sonucu
 */
function validateVAPIDKeys(keys) {
  try {
    console.log('\n🧪 VAPID anahtarları doğrulanıyor...');
    
    // Public key kontrolü
    if (!keys.publicKey || keys.publicKey.length !== 87) {
      throw new Error(`Public key uzunluğu hatalı: ${keys.publicKey?.length} (beklenen: 87)`);
    }
    
    // Private key kontrolü
    if (!keys.privateKey || keys.privateKey.length < 40) {
      throw new Error(`Private key çok kısa: ${keys.privateKey?.length}`);
    }
    
    // Base64URL formatı kontrolü
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    if (!base64UrlRegex.test(keys.publicKey)) {
      throw new Error('Public key geçersiz Base64URL formatında');
    }
    
    if (!base64UrlRegex.test(keys.privateKey)) {
      throw new Error('Private key geçersiz Base64URL formatında');
    }
    
    console.log('✅ Tüm doğrulamalar başarılı!');
    return true;
    
  } catch (error) {
    console.error('❌ Doğrulama hatası:', error.message);
    return false;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    const keys = await generateVAPIDKeys();
    
    // Anahtarları doğrula
    const isValid = validateVAPIDKeys(keys);
    
    if (isValid) {
      console.log('\n🎉 İşlem başarıyla tamamlandı!');
      console.log('Anahtarlarınızı güvenli bir yerde saklayın.');
    }
    
    return keys;
    
  } catch (error) {
    console.error('❌ Ana fonksiyon hatası:', error.message);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  generateVAPIDKeys,
  validateVAPIDKeys,
  bufferToBase64Url,
  extractKeyFromPem,
  main
};

// Eğer bu dosya doğrudan çalıştırılıyorsa
if (require.main === module) {
  main();
}