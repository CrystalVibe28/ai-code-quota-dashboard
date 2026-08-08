import { createServer, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { StorageService } from './storage'
import { UsageDataService } from './usage-data'
import type { LocalUsageCache, UsageApiResponse } from '@shared/types'

export const LOCAL_API_HOST = '127.0.0.1'
export const LOCAL_API_PORT = 3210
export const USAGE_API_PATH = '/api/v1/usage'

export const getLocalApiHost = (allowRemoteAccess: boolean): string =>
  allowRemoteAccess ? '0.0.0.0' : LOCAL_API_HOST

interface LocalApiOptions {
  host?: string
  port?: number
  getUsage?: () => LocalUsageCache
  isUnlocked?: () => boolean
}

export class LocalApiService {
  private server: Server | null = null
  private readonly host: string
  private readonly port: number
  private readonly getUsage: () => LocalUsageCache
  private readonly isUnlocked: () => boolean

  constructor(options: LocalApiOptions = {}) {
    this.host = options.host ?? LOCAL_API_HOST
    this.port = options.port ?? LOCAL_API_PORT
    this.getUsage = options.getUsage ??
      (() => UsageDataService.getInstance().getCachedUsage())
    this.isUnlocked = options.isUnlocked ??
      (() => new StorageService().isUnlocked())
  }

  start(): Promise<number> {
    if (this.server?.listening) {
      return Promise.resolve((this.server.address() as AddressInfo).port)
    }

    const server = createServer((request, response) => {
      try {
        const url = new URL(request.url ?? '/', 'http://localhost')
        if (url.pathname !== USAGE_API_PATH) {
          this.sendJson(response, 404, { error: 'Not found' })
          return
        }
        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET')
          this.sendJson(response, 405, { error: 'Method not allowed' })
          return
        }
        if (!this.isUnlocked()) {
          this.sendJson(response, 423, { error: 'Storage is locked' })
          return
        }

        const body: UsageApiResponse = {
          version: 1,
          source: 'local-cache',
          ...this.getUsage()
        }
        this.sendJson(response, 200, body)
      } catch {
        this.sendJson(response, 500, { error: 'Internal server error' })
      }
    })
    this.server = server

    return new Promise((resolve, reject) => {
      const handleError = (error: Error) => {
        this.server = null
        reject(error)
      }
      server.once('error', handleError)
      server.listen(this.port, this.host, () => {
        server.off('error', handleError)
        server.on('error', error => {
          console.error('[Local API] Server error:', error)
        })
        resolve((server.address() as AddressInfo).port)
      })
    })
  }

  stop(): Promise<void> {
    const server = this.server
    this.server = null
    if (!server) return Promise.resolve()

    return new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })
  }

  private sendJson(response: ServerResponse, status: number, value: unknown): void {
    const body = JSON.stringify(value)
    response.writeHead(status, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'X-Content-Type-Options': 'nosniff'
    })
    response.end(body)
  }
}
