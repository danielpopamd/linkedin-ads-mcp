#!/usr/bin/env node

import 'dotenv/config';
import { TokenStore } from './auth/token-store.js';
import { LinkedInOAuth } from './auth/oauth.js';

async function main() {
  console.log('LinkedIn Ads MCP - Authentication Setup\n');
  console.log('========================================\n');

  // Check for required environment variables
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    console.error('Error: Missing required environment variables.');
    console.error('Please set the following environment variables:');
    console.error('  - LINKEDIN_CLIENT_ID');
    console.error('  - LINKEDIN_CLIENT_SECRET');
    console.error('\nYou can get these from https://www.linkedin.com/developers/apps');
    process.exit(1);
  }

  const tokenStore = new TokenStore();

  // Check if already authenticated
  const hasToken = await tokenStore.hasValidToken();
  if (hasToken) {
    const expInfo = tokenStore.getTokenExpirationInfo();
    if (expInfo && !expInfo.isExpired) {
      console.log('You are already authenticated!');
      console.log(`Token expires: ${expInfo.expiresAt.toLocaleString()}`);
      console.log(`Time remaining: ${expInfo.expiresInMinutes} minutes`);
      console.log('\nTo re-authenticate, delete your tokens first:');
      console.log('  rm ~/.linkedin-ads-mcp/tokens.json');
      process.exit(0);
    }
  }

  console.log('Starting OAuth authentication flow...\n');

  try {
    const oauth = new LinkedInOAuth(tokenStore);
    const tokens = await oauth.authenticate();

    console.log('\nAuthentication successful!');
    console.log(`Access token expires in ${Math.floor(tokens.expires_in / 86400)} days`);
    if (tokens.refresh_token) {
      console.log('Refresh token obtained - tokens will auto-refresh');
    }
    console.log('\nYou can now use the LinkedIn Ads MCP server.');
  } catch (error) {
    console.error('\nAuthentication failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
