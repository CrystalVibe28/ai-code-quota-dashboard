import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash, randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'

// Test the core crypto algorithms without Electron dependencies
// These are the pure crypto functions extracted from CryptoService

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

// Pure functions to test (same logic as CryptoService)
function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex')
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

function encrypt(data: string, password: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return [salt.toString('hex'), iv.toString('hex'), tag.toString('hex'), encrypted].join(':')
}

function decrypt(encryptedData: string, password: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 4) throw new Error('Invalid encrypted data format')

  const [saltHex, ivHex, tagHex, encrypted] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const key = deriveKey(password, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

describe('CryptoService core algorithms', () => {
  describe('hashPassword', () => {
    it('should produce consistent hash for same input', () => {
      const password = 'testPassword123'
      const salt = 'a'.repeat(64) // 32 bytes in hex

      const hash1 = hashPassword(password, salt)
      const hash2 = hashPassword(password, salt)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different passwords', () => {
      const salt = 'b'.repeat(64)

      const hash1 = hashPassword('password1', salt)
      const hash2 = hashPassword('password2', salt)

      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different salts', () => {
      const password = 'samePassword'

      const hash1 = hashPassword(password, 'a'.repeat(64))
      const hash2 = hashPassword(password, 'b'.repeat(64))

      expect(hash1).not.toBe(hash2)
    })

    it('should return a 64-character hex string (32 bytes)', () => {
      const hash = hashPassword('test', 'c'.repeat(64))
      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('deriveKey', () => {
    it('should produce consistent key for same input', () => {
      const password = 'mySecretKey'
      const salt = Buffer.from('d'.repeat(64), 'hex')

      const key1 = deriveKey(password, salt)
      const key2 = deriveKey(password, salt)

      expect(key1.equals(key2)).toBe(true)
    })

    it('should produce 32-byte key', () => {
      const key = deriveKey('test', Buffer.from('e'.repeat(64), 'hex'))
      expect(key.length).toBe(32)
    })

    it('should produce different keys for different passwords', () => {
      const salt = Buffer.from('f'.repeat(64), 'hex')

      const key1 = deriveKey('password1', salt)
      const key2 = deriveKey('password2', salt)

      expect(key1.equals(key2)).toBe(false)
    })
  })

  describe('encrypt', () => {
    it('should return data in correct format (salt:iv:tag:encrypted)', () => {
      const encrypted = encrypt('test data', 'password')
      const parts = encrypted.split(':')

      expect(parts).toHaveLength(4)
      // Salt should be 64 hex chars (32 bytes)
      expect(parts[0]).toHaveLength(64)
      // IV should be 32 hex chars (16 bytes)
      expect(parts[1]).toHaveLength(32)
      // Tag should be 32 hex chars (16 bytes)
      expect(parts[2]).toHaveLength(32)
      // Encrypted data should exist
      expect(parts[3].length).toBeGreaterThan(0)
    })

    it('should produce different output each time (random salt/iv)', () => {
      const data = 'same data'
      const password = 'same password'

      const encrypted1 = encrypt(data, password)
      const encrypted2 = encrypt(data, password)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty string', () => {
      const encrypted = encrypt('', 'password')
      expect(encrypted.split(':')).toHaveLength(4)
    })

    it('should handle unicode characters', () => {
      const encrypted = encrypt('こんにちは 世界 🌍', 'password')
      expect(encrypted.split(':')).toHaveLength(4)
    })

    it('should handle long data', () => {
      const longData = 'x'.repeat(10000)
      const encrypted = encrypt(longData, 'password')
      expect(encrypted.split(':')).toHaveLength(4)
    })
  })

  describe('decrypt', () => {
    it('should decrypt to original data', () => {
      const originalData = 'Hello, World!'
      const password = 'secretPassword'

      const encrypted = encrypt(originalData, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalData)
    })

    it('should handle unicode characters', () => {
      const originalData = '中文測試 日本語 🎉'
      const password = 'password123'

      const encrypted = encrypt(originalData, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalData)
    })

    it('should handle empty string', () => {
      const encrypted = encrypt('', 'password')
      const decrypted = decrypt(encrypted, 'password')
      expect(decrypted).toBe('')
    })

    it('should handle JSON data', () => {
      const jsonData = JSON.stringify({ name: 'test', value: 123, nested: { a: 1 } })
      const password = 'jsonPassword'

      const encrypted = encrypt(jsonData, password)
      const decrypted = decrypt(encrypted, password)

      expect(JSON.parse(decrypted)).toEqual({ name: 'test', value: 123, nested: { a: 1 } })
    })

    it('should throw error for invalid format', () => {
      expect(() => decrypt('invalid', 'password')).toThrow('Invalid encrypted data format')
      expect(() => decrypt('a:b', 'password')).toThrow('Invalid encrypted data format')
      expect(() => decrypt('a:b:c', 'password')).toThrow('Invalid encrypted data format')
    })

    it('should throw error for wrong password', () => {
      const encrypted = encrypt('secret data', 'correctPassword')

      expect(() => decrypt(encrypted, 'wrongPassword')).toThrow()
    })

    it('should throw error for tampered data', () => {
      const encrypted = encrypt('secret data', 'password')
      const parts = encrypted.split(':')
      // Tamper with the encrypted content
      parts[3] = 'tampered' + parts[3].slice(8)
      const tampered = parts.join(':')

      expect(() => decrypt(tampered, 'password')).toThrow()
    })

    it('should throw error for tampered auth tag', () => {
      const encrypted = encrypt('secret data', 'password')
      const parts = encrypted.split(':')
      // Tamper with the auth tag
      parts[2] = '00'.repeat(16)
      const tampered = parts.join(':')

      expect(() => decrypt(tampered, 'password')).toThrow()
    })
  })

  describe('encrypt/decrypt roundtrip', () => {
    const testCases = [
      { name: 'simple string', data: 'hello' },
      { name: 'empty string', data: '' },
      { name: 'special characters', data: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\' },
      { name: 'unicode', data: '你好世界 مرحبا 🚀🎉💻' },
      { name: 'newlines', data: 'line1\nline2\r\nline3' },
      { name: 'long string', data: 'a'.repeat(1000) },
      { name: 'JSON object', data: JSON.stringify({ accounts: [{ id: 1, email: 'test@example.com' }] }) }
    ]

    testCases.forEach(({ name, data }) => {
      it(`should correctly roundtrip: ${name}`, () => {
        const password = 'testPassword'
        const encrypted = encrypt(data, password)
        const decrypted = decrypt(encrypted, password)
        expect(decrypted).toBe(data)
      })
    })
  })
})
