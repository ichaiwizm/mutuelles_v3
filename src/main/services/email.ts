import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { safeStorage, shell, BrowserWindow } from 'electron'
import { getDb } from '../db/connection'
import { emailClassifier } from './emailClassifier'
import * as http from 'http'
import type {
  EmailConfig,
  EmailMessage,
  EmailFilters,
  EmailImportResult,
  OAuthResult
} from '../../shared/types/email'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const OAUTH_CALLBACK_PORT = 3000

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
]

let oauthServer: http.Server | null = null
let oauthResolve: ((code: string) => void) | null = null

export class EmailService {
  private oauth2Client: OAuth2Client

  constructor() {
    const redirectUri = `http://localhost:${OAUTH_CALLBACK_PORT}`
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    )
  }

  private get db() {
    return getDb()
  }

  private startOAuthServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (oauthServer) {
        oauthServer.close()
      }

      oauthServer = http.createServer((req, res) => {
        const url = new URL(req.url || '', `http://localhost:${OAUTH_CALLBACK_PORT}`)
        const code = url.searchParams.get('code')

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Authentification réussie</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
                  .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                  .success { color: #10b981; font-size: 48px; margin-bottom: 1rem; }
                  h1 { color: #111827; margin-bottom: 0.5rem; }
                  p { color: #6b7280; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">✓</div>
                  <h1>Authentification réussie !</h1>
                  <p>Vous pouvez fermer cette fenêtre et retourner à l'application.</p>
                </div>
                <script>
                  setTimeout(() => window.close(), 2000);
                </script>
              </body>
            </html>
          `)

          if (oauthResolve) {
            oauthResolve(code)
            oauthResolve = null
          }

          setTimeout(() => {
            if (oauthServer) {
              oauthServer.close()
              oauthServer = null
            }
          }, 1000)
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Erreur d'authentification</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
                  .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                  .error { color: #ef4444; font-size: 48px; margin-bottom: 1rem; }
                  h1 { color: #111827; margin-bottom: 0.5rem; }
                  p { color: #6b7280; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="error">✗</div>
                  <h1>Erreur d'authentification</h1>
                  <p>Aucun code d'autorisation reçu. Veuillez réessayer.</p>
                </div>
              </body>
            </html>
          `)
          reject(new Error('Aucun code d\'autorisation reçu'))
        }
      })

      oauthServer.listen(OAUTH_CALLBACK_PORT, () => {
        console.log(`Serveur OAuth en écoute sur le port ${OAUTH_CALLBACK_PORT}`)
      })

      oauthServer.on('error', (error) => {
        console.error('Erreur serveur OAuth:', error)
        reject(error)
      })

      oauthResolve = resolve
    })
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    })
  }

  async startAuth(): Promise<OAuthResult> {
    try {
      const codePromise = this.startOAuthServer()

      const authUrl = this.getAuthUrl()
      await shell.openExternal(authUrl)

      const code = await Promise.race([
        codePromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: authentification expirée')), 300000)
        )
      ])

      const result = await this.handleCallback(code)
      return result
    } catch (error) {
      console.error('Erreur lors de l\'authentification OAuth:', error)

      if (oauthServer) {
        oauthServer.close()
        oauthServer = null
      }
      oauthResolve = null

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }

  async handleCallback(code: string): Promise<OAuthResult> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      this.oauth2Client.setCredentials(tokens)

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client })
      const { data } = await oauth2.userinfo.get()

      if (!data.email) {
        throw new Error('Impossible de récupérer l\'email de l\'utilisateur')
      }

      const config = await this.saveConfig({
        provider: 'gmail',
        email: data.email,
        displayName: data.name || undefined,
        accessToken: tokens.access_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date || undefined
      })

      return { success: true, config }
    } catch (error) {
      console.error('Erreur lors du callback OAuth:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }

  async saveConfig(config: EmailConfig): Promise<EmailConfig> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Chiffrement indisponible sur ce système')
    }

    const encryptedAccessToken = config.accessToken
      ? safeStorage.encryptString(config.accessToken)
      : null

    const encryptedRefreshToken = config.refreshToken
      ? safeStorage.encryptString(config.refreshToken)
      : null

    const stmt = this.db.prepare(`
      INSERT INTO email_configs (provider, email, display_name, encrypted_access_token, encrypted_refresh_token, expiry_date, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        display_name = excluded.display_name,
        encrypted_access_token = excluded.encrypted_access_token,
        encrypted_refresh_token = excluded.encrypted_refresh_token,
        expiry_date = excluded.expiry_date,
        is_active = 1,
        updated_at = excluded.updated_at
    `)

    stmt.run(
      config.provider,
      config.email,
      config.displayName || null,
      encryptedAccessToken,
      encryptedRefreshToken,
      config.expiryDate || null
    )

    const savedConfig = this.getConfigByEmail(config.email)

    if (!savedConfig) {
      throw new Error(`Impossible de récupérer la config pour ${config.email}`)
    }

    return savedConfig
  }

  getConfigByEmail(email: string): EmailConfig | null {
    const row = this.db
      .prepare('SELECT * FROM email_configs WHERE email = ? AND is_active = 1')
      .get(email) as any

    if (!row) return null

    return {
      id: row.id,
      provider: row.provider,
      email: row.email,
      displayName: row.display_name || undefined,
      expiryDate: row.expiry_date || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  getConfigById(id: number): EmailConfig | null {
    const row = this.db
      .prepare('SELECT * FROM email_configs WHERE id = ? AND is_active = 1')
      .get(id) as any

    if (!row) return null

    return {
      id: row.id,
      provider: row.provider,
      email: row.email,
      displayName: row.display_name || undefined,
      expiryDate: row.expiry_date || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  listConfigs(): EmailConfig[] {
    const rows = this.db
      .prepare('SELECT * FROM email_configs WHERE is_active = 1 ORDER BY created_at DESC')
      .all() as any[]

    return rows.map(row => ({
      id: row.id,
      provider: row.provider,
      email: row.email,
      displayName: row.display_name || undefined,
      expiryDate: row.expiry_date || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  private getDecryptedTokens(configId: number): { accessToken?: string; refreshToken?: string } | null {
    const row = this.db
      .prepare('SELECT encrypted_access_token, encrypted_refresh_token FROM email_configs WHERE id = ?')
      .get(configId) as any

    if (!row) return null

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Chiffrement indisponible')
    }

    const accessToken = row.encrypted_access_token
      ? safeStorage.decryptString(row.encrypted_access_token)
      : undefined

    const refreshToken = row.encrypted_refresh_token
      ? safeStorage.decryptString(row.encrypted_refresh_token)
      : undefined

    return { accessToken, refreshToken }
  }

  async revokeAccess(configId: number): Promise<boolean> {
    const tokens = this.getDecryptedTokens(configId)
    if (tokens?.accessToken) {
      try {
        await this.oauth2Client.revokeToken(tokens.accessToken)
      } catch (error) {
        console.error('Erreur lors de la révocation du token:', error)
      }
    }

    const stmt = this.db.prepare('UPDATE email_configs SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?')
    const result = stmt.run(configId)
    return result.changes > 0
  }

  async fetchEmails(configId: number, filters: EmailFilters): Promise<EmailImportResult> {
    try {
      const config = this.getConfigById(configId)
      if (!config) {
        throw new Error('Configuration introuvable')
      }

      const tokens = this.getDecryptedTokens(configId)
      if (!tokens?.refreshToken) {
        throw new Error('Aucun refresh token disponible')
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: config.expiryDate
      })

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

      let query = ''
      if (filters.days) {
        query = `newer_than:${filters.days}d`
      } else if (filters.dateRange) {
        const fromDate = Math.floor(filters.dateRange.from.getTime() / 1000)
        query = `after:${fromDate}`
      }

      if (filters.query) {
        query += ` ${filters.query}`
      }

      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: filters.maxResults || 500
      })

      const messageIds = listResponse.data.messages || []
      const messages: EmailMessage[] = []

      const batchSize = 10
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize)
        const batchMessages = await Promise.all(
          batch.map(async msg => {
            try {
              const response = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'full'
              })
              return this.parseGmailMessage(response.data)
            } catch (error) {
              console.error(`Erreur récupération message ${msg.id}:`, error)
              return null
            }
          })
        )

        messages.push(...batchMessages.filter(Boolean) as EmailMessage[])
      }

      const classifiedMessages = emailClassifier.classifyBatch(messages)

      const leadsOnly = classifiedMessages.filter(m => m.hasLeadPotential)

      await this.saveImportedEmails(configId, leadsOnly)

      return {
        success: true,
        totalFetched: classifiedMessages.length,
        leadsDetected: leadsOnly.length,
        messages: leadsOnly
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des emails:', error)
      return {
        success: false,
        totalFetched: 0,
        leadsDetected: 0,
        messages: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }

  private parseGmailMessage(gmailMessage: any): EmailMessage {
    const headers = gmailMessage.payload?.headers || []
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    const subject = getHeader('Subject')
    const from = getHeader('From')
    const to = getHeader('To')
    const date = getHeader('Date')

    let content = ''
    let htmlContent = ''

    if (gmailMessage.payload?.body?.data) {
      content = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8')
    } else if (gmailMessage.payload?.parts) {
      for (const part of gmailMessage.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          content = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }
    }

    if (!content && htmlContent) {
      content = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    return {
      id: gmailMessage.id,
      threadId: gmailMessage.threadId,
      subject,
      from,
      to,
      date,
      snippet: gmailMessage.snippet,
      content,
      htmlContent: htmlContent || undefined,
      labels: gmailMessage.labelIds,
      hasLeadPotential: false,
      detectionReasons: []
    }
  }

  private async saveImportedEmails(configId: number, messages: EmailMessage[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO imported_emails (
        id, config_id, thread_id, subject, sender, recipient, email_date,
        snippet, content, html_content, has_lead_potential, detection_reasons, labels
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const msg of messages) {
      stmt.run(
        msg.id,
        configId,
        msg.threadId || null,
        msg.subject,
        msg.from,
        msg.to || null,
        msg.date,
        msg.snippet || null,
        msg.content,
        msg.htmlContent || null,
        msg.hasLeadPotential ? 1 : 0,
        msg.detectionReasons ? JSON.stringify(msg.detectionReasons) : null,
        msg.labels ? JSON.stringify(msg.labels) : null
      )
    }
  }

  getImportedEmails(configId?: number, limit = 100): EmailMessage[] {
    let query = 'SELECT * FROM imported_emails'
    const params: any[] = []

    if (configId) {
      query += ' WHERE config_id = ?'
      params.push(configId)
    }

    query += ' ORDER BY email_date DESC LIMIT ?'
    params.push(limit)

    const rows = this.db.prepare(query).all(...params) as any[]

    return rows.map(row => ({
      id: row.id,
      threadId: row.thread_id,
      subject: row.subject,
      from: row.sender,
      to: row.recipient,
      date: row.email_date,
      snippet: row.snippet,
      content: row.content,
      htmlContent: row.html_content,
      hasLeadPotential: !!row.has_lead_potential,
      detectionReasons: row.detection_reasons ? JSON.parse(row.detection_reasons) : []
    }))
  }
}
