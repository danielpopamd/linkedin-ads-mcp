import 'dotenv/config';
import { LinkedInApiClient } from '../lib/linkedin-api.js';
import { TokenStore } from '../auth/token-store.js';

async function main() {
  const tokenStore = new TokenStore();
  const client = new LinkedInApiClient(tokenStore);

  console.log('Checking authentication...');
  const isAuthenticated = await tokenStore.hasValidToken();
  if (!isAuthenticated) {
    console.error('Not authenticated. Please run: npm run auth');
    process.exit(1);
  }

  console.log('Fetching ad accounts...');
  const accounts = await client.listAdAccounts();
  console.log(`Found ${accounts.length} accounts.`);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  console.log(`Fetching performance from ${startStr} to ${endStr}...`);

  for (const account of accounts) {
    console.log(`
Account: ${account.name} (ID: ${account.id})`);
    try {
      const performance = await client.getCampaignPerformance({
        accountId: account.id,
        startDate: startStr,
        endDate: endStr,
        timeGranularity: 'ALL'
      });
      
      if (performance.length === 0) {
        console.log('  No performance data found for this period.');
      } else {
        // Aggregate totals for the summary
        let totalSpend = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalConversions = 0;

        performance.forEach((p: any) => {
           totalSpend += parseFloat(p.costInUsd || '0');
           totalImpressions += (p.impressions || 0);
           totalClicks += (p.clicks || 0);
           totalConversions += (p.externalWebsiteConversions || 0);
        });

        console.log('  Performance Summary:');
        console.log(`    Spend: $${totalSpend.toFixed(2)}`);
        console.log(`    Impressions: ${totalImpressions}`);
        console.log(`    Clicks: ${totalClicks}`);
        console.log(`    Conversions: ${totalConversions}`);
      }

    } catch (err: any) {
      console.error(`  Error fetching performance: ${err.message}`);
    }
  }
}

main().catch(console.error);
