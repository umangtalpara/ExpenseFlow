import * as crypto from 'crypto';

export class TotpHelper {
  // Generate random base32 secret key
  static generateSecret(length = 20): string {
    const buffer = crypto.randomBytes(length);
    return this.base32Encode(buffer);
  }

  private static base32Encode(buffer: Buffer): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += chars[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private static base32Decode(str: string): Buffer {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanStr = str.replace(/=+$/, '').toUpperCase();
    const buffer = Buffer.alloc(Math.floor((cleanStr.length * 5) / 8));

    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < cleanStr.length; i++) {
      const idx = chars.indexOf(cleanStr[i]);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        buffer[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }

    return buffer;
  }

  // Generate current OTP code
  static getOTP(secret: string): string {
    const key = this.base32Decode(secret);
    const counter = Math.floor(Date.now() / 30000);
    return this.generateToken(key, counter);
  }

  // Verify dynamic 6-digit code
  static verifyCode(secret: string, token: string, window = 1): boolean {
    const key = this.base32Decode(secret);
    const counter = Math.floor(Date.now() / 30000);

    for (let i = -window; i <= window; i++) {
      if (this.generateToken(key, counter + i) === token) {
        return true;
      }
    }
    return false;
  }

  private static generateToken(key: Buffer, counter: number): string {
    const buffer = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = tmp & 255;
      tmp = tmp >> 8;
    }

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 15;
    const binary =
      ((hash[offset] & 127) << 24) |
      ((hash[offset + 1] & 255) << 16) |
      ((hash[offset + 2] & 255) << 8) |
      (hash[offset + 3] & 255);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }
}
