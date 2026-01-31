import { createHash, randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

interface PasswordData {
  salt: string
  hash: string
}

export class CryptoService {
  private dataPath: string
  private passwordFilePath: string

  constructor() {
    this.dataPath = join(app.getPath('userData'), 'data')
    this.passwordFilePath = join(this.dataPath, 'auth.json')
    this.ensureDataDir()
  }

  private ensureDataDir(): void {
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true })
    }
  }

  hasPassword(): boolean {
    return existsSync(this.passwordFilePath)
  }

  isPasswordSkipped(): boolean {
    if (!this.hasPassword()) return false
    try {
      const data = JSON.parse(readFileSync(this.passwordFilePath, 'utf-8'))
      return data.skipped === true
    } catch (error) {
      console.error('[Crypto] Failed to read password file:', error)
      return false
    }
  }

  async skipPassword(): Promise<void> {
    // Use a fixed internal key when password is skipped
    // This still provides some level of obfuscation for stored data
    const internalKey = 'no-password-mode-internal-key'
    const salt = randomBytes(SALT_LENGTH).toString('hex')
    const hash = this.hashPassword(internalKey, salt)
    const data = { salt, hash, skipped: true }
    writeFileSync(this.passwordFilePath, JSON.stringify(data))
  }

  getSkippedPasswordKey(): string {
    return 'no-password-mode-internal-key'
  }

  async setPassword(password: string): Promise<void> {
    const salt = randomBytes(SALT_LENGTH).toString('hex')
    const hash = this.hashPassword(password, salt)
    const data: PasswordData = { salt, hash }
    writeFileSync(this.passwordFilePath, JSON.stringify(data))
  }

  async verifyPassword(password: string): Promise<boolean> {
    if (!this.hasPassword()) return false
    
    try {
      const data: PasswordData = JSON.parse(readFileSync(this.passwordFilePath, 'utf-8'))
      const hash = this.hashPassword(password, data.salt)
      return hash === data.hash
    } catch (error) {
      console.error('[Crypto] Failed to verify password:', error)
      return false
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const isValid = await this.verifyPassword(oldPassword)
    if (!isValid) throw new Error('Invalid old password')
    await this.setPassword(newPassword)
  }

  private hashPassword(password: string, salt: string): string {
    return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex')
  }

  deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
  }

  encrypt(data: string, password: string): string {
    const salt = randomBytes(SALT_LENGTH)
    const key = this.deriveKey(password, salt)
    const iv = randomBytes(IV_LENGTH)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()

    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':')
  }

  decrypt(encryptedData: string, password: string): string {
    const parts = encryptedData.split(':')
    if (parts.length !== 4) throw new Error('Invalid encrypted data format')

    const [saltHex, ivHex, tagHex, encrypted] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const key = this.deriveKey(password, salt)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}
