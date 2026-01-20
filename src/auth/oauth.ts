import express from 'express';
import open from 'open';
import * as crypto from 'crypto';
import { TokenStore } from './token-store.js';
import { LinkedInTokens } from '../lib/types.js';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

// Scopes required for LinkedIn Ads API
// - rw_ads: Read-write access to ads (includes reading images)
// - r_ads_reporting: Read ads analytics/reporting
// - r_organization_social: Read organization posts (to get creative content/images)
const SCOPES = ['rw_ads', 'r_ads_reporting', 'r_organization_social'];

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class LinkedInOAuth {
  private config: OAuthConfig;
  private tokenStore: TokenStore;

  constructor(tokenStore: TokenStore) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing LinkedIn OAuth credentials. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.'
      );
    }

    this.config = {
      clientId,
      clientSecret,
      redirectUri,
    };
    this.tokenStore = tokenStore;
  }

  /**
   * Starts the OAuth flow by opening the browser and starting a local server
   * to handle the callback.
   */
  async authenticate(): Promise<LinkedInTokens> {
    return new Promise((resolve, reject) => {
      const app = express();
      const state = crypto.randomBytes(16).toString('hex');

      // Parse the redirect URI to get port
      const redirectUrl = new URL(this.config.redirectUri);
      const port = parseInt(redirectUrl.port) || 3000;

      const server = app.listen(port, () => {
        console.log(`OAuth callback server listening on port ${port}`);
      });

      // Set a timeout for the OAuth flow
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('OAuth flow timed out after 5 minutes'));
      }, 5 * 60 * 1000);

      // Handle the callback
      app.get('/callback', async (req, res) => {
        try {
          const { code, state: returnedState, error, error_description } = req.query;

          if (error) {
            throw new Error(`OAuth error: ${error} - ${error_description}`);
          }

          if (returnedState !== state) {
            throw new Error('State mismatch - possible CSRF attack');
          }

          if (!code || typeof code !== 'string') {
            throw new Error('No authorization code received');
          }

          // Exchange code for tokens
          const tokens = await this.exchangeCodeForTokens(code);

          // Save tokens
          await this.tokenStore.saveTokens(tokens);

          res.send(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #0077b5;">Authentication Successful!</h1>
                  <p>You can close this window and return to your terminal.</p>
                  <p style="color: #666;">Token expires in ${Math.floor(tokens.expires_in / 86400)} days</p>
                </div>
              </body>
            </html>
          `);

          clearTimeout(timeout);
          server.close();
          resolve(tokens);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          res.status(400).send(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #cc0000;">Authentication Failed</h1>
                  <p>${errorMessage}</p>
                </div>
              </body>
            </html>
          `);

          clearTimeout(timeout);
          server.close();
          reject(error);
        }
      });

      // Build authorization URL
      const authUrl = new URL(LINKEDIN_AUTH_URL);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', SCOPES.join(' '));

      console.log('\nOpening browser for LinkedIn authentication...');
      console.log('If the browser does not open, visit this URL:');
      console.log(authUrl.toString());
      console.log();

      // Open the browser
      open(authUrl.toString()).catch(() => {
        console.log('Failed to open browser automatically. Please open the URL above manually.');
      });
    });
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   */
  private async exchangeCodeForTokens(code: string): Promise<LinkedInTokens> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const tokens = await response.json() as Omit<LinkedInTokens, 'expires_at'>;
    const now = Math.floor(Date.now() / 1000);

    return {
      ...tokens,
      expires_at: now + tokens.expires_in,
    };
  }
}
