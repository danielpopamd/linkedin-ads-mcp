#!/usr/bin/env node

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { TokenStore } from '../auth/token-store.js';
import { LinkedInApiClient } from '../lib/linkedin-api.js';

// ==================== LinkedIn Demographic Mappings ====================

const SENIORITY_MAP: Record<string, string> = {
  '1': 'Unpaid',
  '2': 'Training',
  '3': 'Entry Level',
  '4': 'Senior',
  '5': 'Manager',
  '6': 'Director',
  '7': 'VP',
  '8': 'CXO',
  '9': 'Partner',
  '10': 'Owner',
};

const JOB_FUNCTION_MAP: Record<string, string> = {
  '1': 'Accounting',
  '2': 'Administrative',
  '3': 'Arts & Design',
  '4': 'Business Development',
  '5': 'Community & Social Services',
  '6': 'Consulting',
  '7': 'Education',
  '8': 'Engineering',
  '9': 'Entrepreneurship',
  '10': 'Finance',
  '11': 'Healthcare Services',
  '12': 'Human Resources',
  '13': 'Information Technology',
  '14': 'Legal',
  '15': 'Marketing',
  '16': 'Media & Communications',
  '17': 'Military & Protective Services',
  '18': 'Operations',
  '19': 'Product Management',
  '20': 'Program & Project Management',
  '21': 'Purchasing',
  '22': 'Quality Assurance',
  '23': 'Real Estate',
  '24': 'Research',
  '25': 'Sales',
  '26': 'Support',
};

const INDUSTRY_MAP: Record<string, string> = {
  '1': 'Defense & Space',
  '3': 'Computer Hardware',
  '4': 'Computer Software',
  '5': 'Computer Networking',
  '6': 'Internet',
  '7': 'Semiconductors',
  '8': 'Telecommunications',
  '9': 'Law Practice',
  '10': 'Legal Services',
  '11': 'Management Consulting',
  '12': 'Biotechnology',
  '13': 'Medical Practice',
  '14': 'Hospital & Health Care',
  '15': 'Pharmaceuticals',
  '16': 'Veterinary',
  '17': 'Medical Devices',
  '18': 'Cosmetics',
  '19': 'Apparel & Fashion',
  '20': 'Sporting Goods',
  '21': 'Tobacco',
  '22': 'Supermarkets',
  '23': 'Food Production',
  '24': 'Consumer Electronics',
  '25': 'Consumer Goods',
  '26': 'Furniture',
  '27': 'Retail',
  '28': 'Entertainment',
  '29': 'Gambling & Casinos',
  '30': 'Leisure, Travel & Tourism',
  '31': 'Hospitality',
  '32': 'Restaurants',
  '33': 'Sports',
  '34': 'Food & Beverages',
  '35': 'Motion Pictures & Film',
  '36': 'Broadcast Media',
  '37': 'Museums & Institutions',
  '38': 'Fine Art',
  '39': 'Performing Arts',
  '40': 'Recreational Facilities',
  '41': 'Banking',
  '42': 'Insurance',
  '43': 'Financial Services',
  '44': 'Real Estate',
  '45': 'Investment Banking',
  '46': 'Investment Management',
  '47': 'Accounting',
  '48': 'Construction',
  '49': 'Building Materials',
  '50': 'Architecture & Planning',
  '51': 'Civil Engineering',
  '52': 'Aviation & Aerospace',
  '53': 'Automotive',
  '54': 'Chemicals',
  '55': 'Machinery',
  '56': 'Mining & Metals',
  '57': 'Oil & Energy',
  '58': 'Shipbuilding',
  '59': 'Utilities',
  '60': 'Textiles',
  '61': 'Paper & Forest Products',
  '62': 'Railroad Manufacture',
  '63': 'Farming',
  '64': 'Ranching',
  '65': 'Dairy',
  '66': 'Fishery',
  '67': 'Primary/Secondary Education',
  '68': 'Higher Education',
  '69': 'Education Management',
  '70': 'Research',
  '71': 'Military',
  '72': 'Legislative Office',
  '73': 'Judiciary',
  '74': 'International Affairs',
  '75': 'Government Administration',
  '76': 'Executive Office',
  '77': 'Law Enforcement',
  '78': 'Public Safety',
  '79': 'Public Policy',
  '80': 'Marketing & Advertising',
  '81': 'Newspapers',
  '82': 'Publishing',
  '83': 'Printing',
  '84': 'Information Services',
  '85': 'Libraries',
  '86': 'Environmental Services',
  '87': 'Package/Freight Delivery',
  '88': 'Individual & Family Services',
  '89': 'Religious Institutions',
  '90': 'Civic & Social Organization',
  '91': 'Consumer Services',
  '92': 'Transportation/Trucking/Railroad',
  '93': 'Warehousing',
  '94': 'Airlines/Aviation',
  '95': 'Maritime',
  '96': 'Information Technology & Services',
  '97': 'Market Research',
  '98': 'Public Relations & Communications',
  '99': 'Design',
  '100': 'Non-Profit Organization Management',
  '101': 'Fund-Raising',
  '102': 'Program Development',
  '103': 'Writing & Editing',
  '104': 'Staffing & Recruiting',
  '105': 'Professional Training & Coaching',
  '106': 'Venture Capital & Private Equity',
  '107': 'Political Organization',
  '108': 'Translation & Localization',
  '109': 'Computer Games',
  '110': 'Events Services',
  '111': 'Arts & Crafts',
  '112': 'Electrical/Electronic Manufacturing',
  '113': 'Online Media',
  '114': 'Nanotechnology',
  '115': 'Music',
  '116': 'Logistics & Supply Chain',
  '117': 'Plastics',
  '118': 'Computer & Network Security',
  '119': 'Wireless',
  '120': 'Alternative Dispute Resolution',
  '121': 'Security & Investigations',
  '122': 'Facilities Services',
  '123': 'Outsourcing/Offshoring',
  '124': 'Health, Wellness & Fitness',
  '125': 'Alternative Medicine',
  '126': 'Media Production',
  '127': 'Animation',
  '128': 'Commercial Real Estate',
  '129': 'Capital Markets',
  '130': 'Think Tanks',
  '131': 'Philanthropy',
  '132': 'E-Learning',
  '133': 'Wholesale',
  '134': 'Import & Export',
  '135': 'Mechanical or Industrial Engineering',
  '136': 'Photography',
  '137': 'Human Resources',
  '138': 'Business Supplies & Equipment',
  '139': 'Mental Health Care',
  '140': 'Graphic Design',
  '141': 'International Trade & Development',
  '142': 'Wine & Spirits',
  '143': 'Luxury Goods & Jewelry',
  '144': 'Renewables & Environment',
  '145': 'Glass, Ceramics & Concrete',
  '146': 'Packaging & Containers',
  '147': 'Industrial Automation',
  '148': 'Government Relations',
};

const COMPANY_SIZE_MAP: Record<string, string> = {
  'A': 'Self-employed',
  'B': '1-10 employees',
  'C': '11-50 employees',
  'D': '51-200 employees',
  'E': '201-500 employees',
  'F': '501-1,000 employees',
  'G': '1,001-5,000 employees',
  'H': '5,001-10,000 employees',
  'I': '10,001+ employees',
  // LinkedIn API v2 enum values
  'SIZE_1': 'Self-employed',
  'SIZE_2_TO_10': '2-10 employees',
  'SIZE_11_TO_50': '11-50 employees',
  'SIZE_51_TO_200': '51-200 employees',
  'SIZE_201_TO_500': '201-500 employees',
  'SIZE_501_TO_1000': '501-1,000 employees',
  'SIZE_1001_TO_5000': '1,001-5,000 employees',
  'SIZE_5001_TO_10000': '5,001-10,000 employees',
  'SIZE_10001_OR_MORE': '10,001+ employees',
};

const COUNTRY_MAP: Record<string, string> = {
  'us': 'United States',
  'gb': 'United Kingdom',
  'ca': 'Canada',
  'au': 'Australia',
  'de': 'Germany',
  'fr': 'France',
  'in': 'India',
  'nl': 'Netherlands',
  'sg': 'Singapore',
  'ae': 'United Arab Emirates',
  'es': 'Spain',
  'it': 'Italy',
  'br': 'Brazil',
  'mx': 'Mexico',
  'jp': 'Japan',
  'kr': 'South Korea',
  'se': 'Sweden',
  'ch': 'Switzerland',
  'be': 'Belgium',
  'ie': 'Ireland',
  'nz': 'New Zealand',
  'za': 'South Africa',
  'pl': 'Poland',
  'at': 'Austria',
  'dk': 'Denmark',
  'no': 'Norway',
  'fi': 'Finland',
  'pt': 'Portugal',
  'il': 'Israel',
  'hk': 'Hong Kong',
};

function getDemographicName(type: string, rawValue: string): string {
  // Extract the ID from URN format like "urn:li:seniority:3" or just "3"
  const id = rawValue.includes(':') ? rawValue.split(':').pop() || rawValue : rawValue;

  switch (type) {
    case 'seniority':
      return SENIORITY_MAP[id] || `Seniority ${id}`;
    case 'jobFunction':
      return JOB_FUNCTION_MAP[id] || `Function ${id}`;
    case 'industry':
      return INDUSTRY_MAP[id] || `Industry ${id}`;
    case 'companySize':
      return COMPANY_SIZE_MAP[id] || `Size ${id}`;
    case 'country':
      return COUNTRY_MAP[id.toLowerCase()] || id.toUpperCase();
    default:
      return id;
  }
}

// ==================== Main Dashboard Generator ====================

async function generateDashboard() {
  console.log('Fetching LinkedIn Ads data...\n');

  const tokenStore = new TokenStore();
  const client = new LinkedInApiClient(tokenStore);

  const hasToken = await tokenStore.hasValidToken();
  if (!hasToken) {
    console.error('Not authenticated. Please run: npm run auth');
    process.exit(1);
  }

  // Calculate date range (last 90 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  console.log(`Date range: ${startDateStr} to ${endDateStr}\n`);

  const accountId = '507402151';
  const accountName = 'Cronofy';
  console.log(`Using account: ${accountName} (${accountId})\n`);

  // 1. Get campaign performance
  console.log('Fetching campaign performance...');
  const campaignAnalytics = await client.getCampaignPerformance({
    accountId,
    startDate: startDateStr,
    endDate: endDateStr,
    timeGranularity: 'ALL',
    metrics: [
      'impressions', 'clicks', 'landingPageClicks', 'totalEngagements',
      'costInUsd', 'costInLocalCurrency', 'externalWebsiteConversions',
      'approximateUniqueImpressions', 'audiencePenetration',
    ],
  });

  const campaignIds = (campaignAnalytics || []).map((record: any) => {
    const campaignUrn = record.pivotValues?.[0] || '';
    return campaignUrn.split(':').pop() || '';
  }).filter(Boolean);

  console.log(`Fetching details for ${campaignIds.length} campaigns...`);
  const campaignDetailsMap = await client.getCampaignsByIds(accountId, campaignIds);

  // Fetch campaign groups
  console.log('Fetching campaign groups...');
  const campaignGroupsList = await client.listCampaignGroups(accountId);
  const campaignGroupMap = new Map<string, { id: string; name: string }>();
  for (const group of campaignGroupsList) {
    const groupId = String(group.id).includes(':') ? group.id.split(':').pop()! : String(group.id);
    campaignGroupMap.set(groupId, { id: groupId, name: group.name });
  }
  console.log(`Found ${campaignGroupMap.size} campaign groups`);

  const campaignData = (campaignAnalytics || []).map((record: any) => {
    const campaignUrn = record.pivotValues?.[0] || '';
    const campaignId = campaignUrn.split(':').pop() || '';
    const campaignDetails = campaignDetailsMap.get(campaignId);

    const campaignGroupUrn = campaignDetails?.campaignGroup || '';
    const campaignGroupId = campaignGroupUrn.includes(':') ? campaignGroupUrn.split(':').pop() || '' : '';
    const campaignGroupInfo = campaignGroupMap.get(campaignGroupId);

    const impressions = record.impressions || 0;
    const clicks = record.clicks || 0;
    const cost = parseFloat(record.costInUsd) || 0;
    const conversions = record.externalWebsiteConversions || 0;
    const engagements = record.totalEngagements || 0;
    const reach = record.approximateUniqueImpressions || Math.round(impressions * 0.7);
    const rawAudPen = record.audiencePenetration;

    const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;
    const cpc = clicks > 0 ? (cost / clicks) : 0;
    const cpm = impressions > 0 ? ((cost / impressions) * 1000) : 0;
    const frequency = reach > 0 ? (impressions / reach) : 0;
    const conversionRate = clicks > 0 ? ((conversions / clicks) * 100) : 0;
    const engagementRate = impressions > 0 ? ((engagements / impressions) * 100) : 0;

    return {
      id: campaignId,
      name: campaignDetails?.name || `Campaign ${campaignId}`,
      status: campaignDetails?.status || 'ACTIVE',
      campaignGroupId,
      campaignGroupName: campaignGroupInfo?.name || 'Ungrouped',
      impressions,
      reach,
      frequency: frequency.toFixed(2),
      clicks,
      ctr: ctr.toFixed(2),
      engagements,
      engagementRate: engagementRate.toFixed(2),
      cost: cost.toFixed(2),
      cpm: cpm.toFixed(2),
      cpc: cpc.toFixed(2),
      conversions,
      conversionRate: conversionRate.toFixed(2),
      costPerConversion: conversions > 0 ? (cost / conversions).toFixed(2) : 'N/A',
      audiencePenetration: rawAudPen != null ? (rawAudPen > 1 ? rawAudPen.toFixed(2) : (rawAudPen * 100).toFixed(2)) : null,
    };
  }).sort((a, b) => b.impressions - a.impressions);

  // Build deduplicated campaign groups list for the dropdown
  const campaignGroups = Array.from(
    new Map(campaignData.filter(c => c.campaignGroupId).map(c => [c.campaignGroupId, { id: c.campaignGroupId, name: c.campaignGroupName }])).values()
  );

  console.log(`Found ${campaignData.length} campaigns with data\n`);

  // 2. Get creative performance
  console.log('Fetching creative performance...');
  const creativeAnalytics = await client.getAnalytics({
    accountId,
    pivot: 'CREATIVE' as any,
    startDate: startDateStr,
    endDate: endDateStr,
    timeGranularity: 'ALL',
    metrics: [
      'impressions', 'clicks', 'landingPageClicks', 'totalEngagements',
      'costInUsd', 'costInLocalCurrency', 'externalWebsiteConversions',
      'approximateUniqueImpressions', 'likes', 'comments', 'shares',
      'reactions', 'follows', 'videoViews', 'videoStarts', 'videoCompletions',
      'videoFirstQuartileCompletions', 'videoMidpointCompletions',
      'videoThirdQuartileCompletions', 'audiencePenetration',
    ],
  });

  const creativeIds = (creativeAnalytics || []).map((record: any) => {
    const creativeUrn = record.pivotValues?.[0] || '';
    return creativeUrn.split(':').pop() || '';
  }).filter(Boolean);

  console.log(`Fetching details for ${creativeIds.length} creatives...`);
  const creativeDetailsMap = await client.getCreativesByIds(accountId, creativeIds);
  console.log(`Got ${creativeDetailsMap.size} creatives from API.`);

  // Fetch creative content from posts
  console.log('Fetching creative content from posts...');
  const creativeContentMap = new Map<string, { imageUrl: string; headline: string; primaryText: string; landingPageUrl: string; contentType: string }>();
  const creativesToFetch = Array.from(creativeDetailsMap.entries());
  const batchSize = 5;

  for (let i = 0; i < creativesToFetch.length; i += batchSize) {
    const batch = creativesToFetch.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async ([id, creative]) => {
        const content = await client.getCreativeContent(creative, false);
        return { id, content };
      })
    );
    for (const { id, content } of results) {
      creativeContentMap.set(id, content);
    }
    process.stdout.write(`\rFetched content for ${Math.min(i + batchSize, creativesToFetch.length)}/${creativesToFetch.length} creatives...`);
  }
  console.log(' Done!');

  const creativeData = (creativeAnalytics || []).map((record: any) => {
    const creativeUrn = record.pivotValues?.[0] || '';
    const creativeId = creativeUrn.split(':').pop() || '';
    const creativeDetails = creativeDetailsMap.get(creativeId);
    const resolvedContent = creativeContentMap.get(creativeId);

    const impressions = record.impressions || 0;
    const clicks = record.clicks || 0;
    const cost = parseFloat(record.costInUsd) || 0;
    const conversions = record.externalWebsiteConversions || 0;
    const engagements = record.totalEngagements || 0;
    const likes = record.likes || 0;
    const comments = record.comments || 0;
    const shares = record.shares || 0;
    const videoViews = record.videoViews || 0;
    const videoCompletions = record.videoCompletions || 0;

    let campaignId = '';
    if (creativeDetails?.campaign) {
      campaignId = creativeDetails.campaign.split(':').pop() || '';
    }

    const imageUrl = resolvedContent?.imageUrl || '';
    const headline = resolvedContent?.headline || creativeDetails?.name || '';
    const primaryText = resolvedContent?.primaryText || '';
    const landingPageUrl = resolvedContent?.landingPageUrl || '';

    let contentType = resolvedContent?.contentType || 'UNKNOWN';
    // Override: if we have video views but type isn't VIDEO, make it VIDEO
    if (contentType !== 'VIDEO' && videoViews > 0) contentType = 'VIDEO';

    const status = creativeDetails?.intendedStatus || creativeDetails?.status || 'UNKNOWN';
    const reach = record.approximateUniqueImpressions || Math.round(impressions * 0.7);
    const rawAudPen = record.audiencePenetration;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;
    const cpc = clicks > 0 ? (cost / clicks) : 0;
    const cpm = impressions > 0 ? ((cost / impressions) * 1000) : 0;
    const frequency = reach > 0 ? (impressions / reach) : 0;
    const conversionRate = clicks > 0 ? ((conversions / clicks) * 100) : 0;
    const engagementRate = impressions > 0 ? ((engagements / impressions) * 100) : 0;

    return {
      id: creativeId,
      campaignId,
      campaignName: campaignDetailsMap.get(campaignId)?.name || '',
      status,
      type: contentType,
      imageUrl,
      headline,
      primaryText,
      landingPageUrl,
      impressions,
      reach,
      frequency: frequency.toFixed(2),
      clicks,
      ctr: ctr.toFixed(2),
      engagements,
      engagementRate: engagementRate.toFixed(2),
      likes,
      comments,
      shares,
      cost: cost.toFixed(2),
      cpm: cpm.toFixed(2),
      cpc: cpc.toFixed(2),
      conversions,
      conversionRate: conversionRate.toFixed(2),
      costPerConversion: conversions > 0 ? (cost / conversions).toFixed(2) : 'N/A',
      videoViews,
      videoCompletions,
      videoCompletionRate: videoViews > 0 ? ((videoCompletions / videoViews) * 100).toFixed(1) : null,
      audiencePenetration: rawAudPen != null ? (rawAudPen > 1 ? rawAudPen.toFixed(2) : (rawAudPen * 100).toFixed(2)) : null,
    };
  }).sort((a, b) => b.impressions - a.impressions);

  console.log(`Found ${creativeData.length} creatives with data\n`);

  // 3. Get daily trends (per-campaign for filtered chart)
  console.log('Fetching daily trends per campaign...');
  const dailyAnalytics = await client.getAnalytics({
    accountId,
    pivot: 'CAMPAIGN',
    startDate: startDateStr,
    endDate: endDateStr,
    timeGranularity: 'DAILY',
    metrics: [
      'impressions', 'clicks', 'landingPageClicks', 'totalEngagements',
      'costInUsd', 'costInLocalCurrency', 'externalWebsiteConversions',
      'approximateUniqueImpressions',
    ],
  });

  const dailyData = (dailyAnalytics || [])
    .filter((r: any) => r.dateRange)
    .map((record: any) => {
      const dr = record.dateRange;
      const date = `${dr.start.year}-${String(dr.start.month).padStart(2, '0')}-${String(dr.start.day).padStart(2, '0')}`;
      const campaignUrn = record.pivotValues?.[0] || '';
      const campaignId = campaignUrn.split(':').pop() || '';
      return {
        campaignId,
        date,
        impressions: record.impressions || 0,
        clicks: record.clicks || 0,
        cost: parseFloat(record.costInUsd) || 0,
        conversions: record.externalWebsiteConversions || 0,
        engagements: record.totalEngagements || 0,
        reach: record.approximateUniqueImpressions || 0,
      };
    })
    .filter((r: any) => r.date)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  const uniqueDays = new Set(dailyData.map((d: any) => d.date)).size;
  console.log(`Got ${uniqueDays} days of trend data (${dailyData.length} campaign-day records)\n`);

  // 4. Get per-campaign demographics data
  console.log('Fetching per-campaign demographics data...');

  const demographicTypes = [
    { type: 'MEMBER_JOB_FUNCTION', key: 'jobFunction' },
    { type: 'MEMBER_SENIORITY', key: 'seniority' },
    { type: 'MEMBER_INDUSTRY', key: 'industry' },
    { type: 'MEMBER_COMPANY_SIZE', key: 'companySize' },
    { type: 'MEMBER_COUNTRY', key: 'country' },
  ];

  const perCampaignDemographics: Record<string, Record<string, any[]>> = {};

  function parseDemoRecords(key: string, data: any[]): any[] {
    return (data || []).map((record: any) => {
      const rawValue = record.pivotValues?.[0] || 'Unknown';
      const name = getDemographicName(key, rawValue);
      const impressions = record.impressions || 0;
      const clicks = record.clicks || 0;
      const cost = parseFloat(record.costInUsd) || 0;
      const conversions = record.externalWebsiteConversions || 0;
      const engagements = record.totalEngagements || 0;
      const reach = record.approximateUniqueImpressions || Math.round(impressions * 0.7);
      return { name, impressions, reach, clicks, cost, conversions, engagements };
    });
  }

  for (let ci = 0; ci < campaignIds.length; ci++) {
    const cid = campaignIds[ci];
    perCampaignDemographics[cid] = {};

    const results = await Promise.all(
      demographicTypes.map(async ({ type, key }) => {
        try {
          const data = await client.getAnalytics({
            accountId,
            pivot: type as any,
            startDate: startDateStr,
            endDate: endDateStr,
            timeGranularity: 'ALL',
            campaigns: [cid],
          });
          return { key, data: parseDemoRecords(key, data) };
        } catch {
          return { key, data: [] };
        }
      })
    );

    for (const { key, data } of results) {
      perCampaignDemographics[cid][key] = data;
    }
    process.stdout.write(`\r  Fetched demographics for campaign ${ci + 1}/${campaignIds.length}...`);
  }
  console.log(' Done!');

  // 5. Fetch conversion breakdown data
  console.log('\nFetching conversion definitions...');
  const conversionDefs = await client.listConversions(accountId);
  const conversionNameMap = new Map<string, string>();
  for (const conv of conversionDefs) {
    const convId = String(conv.id).includes(':') ? conv.id.split(':').pop()! : String(conv.id);
    conversionNameMap.set(convId, conv.name);
  }
  console.log(`Found ${conversionDefs.length} conversion definitions`);

  const campaignsWithConversions = campaignData.filter(c => c.conversions > 0);
  console.log(`Fetching per-campaign conversion performance for ${campaignsWithConversions.length} campaigns...`);
  const conversionData: any[] = [];

  const convBatchSize = 5;
  for (let i = 0; i < campaignsWithConversions.length; i += convBatchSize) {
    const batch = campaignsWithConversions.slice(i, i + convBatchSize);
    const results = await Promise.all(
      batch.map(async (campaign) => {
        try {
          const analytics = await client.getConversionPerformance({
            accountId,
            campaignIds: [campaign.id],
            startDate: startDateStr,
            endDate: endDateStr,
          });
          return { campaignId: campaign.id, campaignName: campaign.name, analytics };
        } catch {
          return { campaignId: campaign.id, campaignName: campaign.name, analytics: [] };
        }
      })
    );
    for (const { campaignId, campaignName, analytics } of results) {
      for (const record of analytics as any[]) {
        const conversionUrn = record.pivotValues?.[0] || '';
        const conversionId = conversionUrn.split(':').pop() || '';
        const totalConversions = record.externalWebsiteConversions || 0;
        if (totalConversions === 0) continue;
        conversionData.push({
          campaignId,
          campaignName,
          conversionId,
          conversionName: conversionNameMap.get(conversionId) || `Conversion ${conversionId}`,
          totalConversions,
          postClickConversions: record.externalWebsitePostClickConversions || 0,
          postViewConversions: record.externalWebsitePostViewConversions || 0,
          conversionValue: parseFloat(record.conversionValueInLocalCurrency) || 0,
          cost: parseFloat(record.costInUsd) || 0,
        });
      }
    }
  }
  console.log(`Collected ${conversionData.length} campaign-conversion records`);

  // Calculate totals
  const totals = {
    impressions: campaignData.reduce((sum, c) => sum + c.impressions, 0),
    reach: campaignData.reduce((sum, c) => sum + c.reach, 0),
    clicks: campaignData.reduce((sum, c) => sum + c.clicks, 0),
    engagements: campaignData.reduce((sum, c) => sum + c.engagements, 0),
    cost: campaignData.reduce((sum, c) => sum + parseFloat(c.cost), 0),
    conversions: campaignData.reduce((sum, c) => sum + c.conversions, 0),
  };

  // Generate HTML dashboard
  console.log('\nGenerating dashboard...');
  const html = generateHTML(accountName, startDateStr, endDateStr, totals, campaignData, creativeData, dailyData, perCampaignDemographics, campaignGroups, conversionData);

  const outputPath = path.join(process.cwd(), 'dashboard.html');
  fs.writeFileSync(outputPath, html);

  console.log(`\nDashboard generated: ${outputPath}`);
  console.log('Open this file in your browser to view the dashboard.');
}

function generateHTML(
  accountName: string,
  startDate: string,
  endDate: string,
  totals: any,
  campaigns: any[],
  creatives: any[],
  dailyData: any[],
  perCampaignDemographics: any,
  campaignGroups: Array<{ id: string; name: string }>,
  conversionData: any[]
): string {
  const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
  const cpm = totals.impressions > 0 ? ((totals.cost / totals.impressions) * 1000).toFixed(2) : '0.00';
  const frequency = totals.reach > 0 ? (totals.impressions / totals.reach).toFixed(2) : '0.00';
  const convRate = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : '0.00';
  const engRate = totals.impressions > 0 ? ((totals.engagements / totals.impressions) * 100).toFixed(2) : '0.00';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkedIn Ads Dashboard - ${accountName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; color: #1f2937; line-height: 1.5; }
    .header { background: linear-gradient(135deg, #0077b5 0%, #004182 100%); color: white; padding: 24px 32px; }
    .header h1 { font-size: 28px; font-weight: 600; }
    .header .subtitle { opacity: 0.9; margin-top: 4px; }
    .container { max-width: 1800px; margin: 0 auto; padding: 24px; }
    .filter-bar { background: white; padding: 16px 24px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .filter-bar label { font-weight: 600; color: #374151; }
    .filter-bar select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; min-width: 250px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .kpi-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-card .value { font-size: 22px; font-weight: 700; color: #0077b5; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111827; border-left: 4px solid #0077b5; padding-left: 12px; }
    .chart-container { height: 300px; position: relative; }
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; overflow-x: auto; }
    .tab { padding: 12px 20px; cursor: pointer; border: none; background: none; font-size: 14px; font-weight: 500; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; }
    .tab:hover { color: #0077b5; }
    .tab.active { color: #0077b5; border-bottom-color: #0077b5; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 10px 8px; background: #f9fafb; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; position: sticky; top: 0; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    tr:hover { background: #f9fafb; }
    tr.clickable { cursor: pointer; }
    tr.clickable:hover { background: #eff6ff; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
    .status.active { background: #d1fae5; color: #065f46; }
    .status.paused, .status.canceled { background: #fef3c7; color: #92400e; }

    /* Creative thumbnail in table */
    .creative-thumb { width: 60px; height: 45px; border-radius: 4px; object-fit: cover; background: #e5e7eb; }
    .creative-thumb-placeholder { width: 60px; height: 45px; border-radius: 4px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); display: flex; align-items: center; justify-content: center; }
    .creative-info { display: flex; align-items: center; gap: 12px; }
    .creative-name { font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .creative-campaign { font-size: 11px; color: #6b7280; }
    .type-badge { font-size: 9px; padding: 2px 6px; background: #e0f2fe; color: #0369a1; border-radius: 3px; }

    /* Modal */
    .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); overflow: auto; }
    .modal.active { display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; }
    .modal-content { background: white; border-radius: 16px; max-width: 1000px; width: 100%; max-height: calc(100vh - 80px); overflow-y: auto; position: relative; }
    .modal-close { position: absolute; right: 16px; top: 16px; font-size: 24px; color: #6b7280; cursor: pointer; background: white; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .modal-close:hover { background: #f3f4f6; color: #111827; }
    .modal-image { width: 100%; max-height: 400px; object-fit: contain; background: #f3f4f6; }
    .modal-body { padding: 24px; }
    .modal-body h2 { font-size: 20px; margin-bottom: 16px; }
    .modal-body .full-text { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 20px; white-space: pre-wrap; background: #f9fafb; padding: 16px; border-radius: 8px; }
    .modal-body .landing-url { margin-bottom: 20px; }
    .modal-body .landing-url a { color: #0077b5; word-break: break-all; }
    .modal-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; padding: 20px; background: #f9fafb; border-radius: 12px; margin-top: 20px; }
    .modal-metric { text-align: center; padding: 8px; }
    .modal-metric .value { font-size: 18px; font-weight: 700; color: #0077b5; }
    .modal-metric .label { font-size: 10px; color: #6b7280; text-transform: uppercase; margin-top: 4px; }

    /* Demographics */
    .demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 24px; }
    .demo-section { background: #f9fafb; border-radius: 12px; padding: 20px; }
    .demo-section h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #111827; }
    .demo-table { width: 100%; font-size: 12px; }
    .demo-table th { text-align: left; padding: 8px; background: #e5e7eb; font-weight: 600; }
    .demo-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .demo-bar-cell { width: 120px; }
    .demo-bar-container { height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .demo-bar { height: 100%; background: linear-gradient(90deg, #0077b5, #00a0dc); border-radius: 4px; }

    /* Filter bar layout */
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-group-label { font-weight: 600; color: #374151; font-size: 13px; }
    .filter-separator { width: 1px; height: 40px; background: #e5e7eb; align-self: center; }
    .campaign-checklist { max-height: 200px; overflow-y: auto; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; background: white; min-width: 300px; }
    .campaign-checklist label { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; cursor: pointer; border-radius: 4px; padding: 4px 6px; }
    .campaign-checklist label:hover { background: #f3f4f6; }
    .campaign-checklist input[type="checkbox"] { accent-color: #0077b5; flex-shrink: 0; }
    .select-actions { display: flex; gap: 8px; margin-top: 4px; }
    .select-actions button { font-size: 11px; color: #0077b5; background: none; border: none; cursor: pointer; padding: 2px 4px; }
    .select-actions button:hover { text-decoration: underline; }

    /* Conversions tab */
    .conv-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .conv-campaign-card { background: #f9fafb; border-radius: 12px; padding: 20px; }
    .conv-campaign-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }

    /* Demographics notice */
    .demo-notice { background: #fef3c7; color: #92400e; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

    /* Creative sub-tabs */
    .creative-sub-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
    .creative-sub-tab { padding: 8px 16px; cursor: pointer; border: 1px solid #d1d5db; background: white; font-size: 13px; font-weight: 500; color: #6b7280; border-radius: 6px; transition: all 0.2s; }
    .creative-sub-tab:hover { color: #0077b5; border-color: #0077b5; }
    .creative-sub-tab.active { background: #0077b5; color: white; border-color: #0077b5; }
    .creative-view { display: none; }
    .creative-view.active { display: block; }
    .group-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .group-card { background: #f9fafb; border-radius: 12px; padding: 20px; }
    .group-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #111827; }
    .group-card .group-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .group-card .gm { text-align: center; }
    .group-card .gm .val { font-size: 16px; font-weight: 700; color: #0077b5; }
    .group-card .gm .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .message-card { background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; gap: 16px; align-items: flex-start; }
    .message-card .msg-rank { font-size: 20px; font-weight: 700; color: #d1d5db; min-width: 32px; }
    .message-card .msg-body { flex: 1; }
    .message-card .msg-headline { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .message-card .msg-text { font-size: 13px; color: #374151; line-height: 1.5; max-height: 60px; overflow: hidden; text-overflow: ellipsis; }
    .message-card .msg-meta { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #6b7280; }
    .message-card .msg-meta strong { color: #0077b5; }

    /* WoW View */
    .wow-toggle { padding: 8px 16px; border: 2px solid #0077b5; background: white; color: #0077b5; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .wow-toggle:hover { background: #eff6ff; }
    .wow-toggle.active { background: #0077b5; color: white; }
    .wow-week-select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; min-width: 200px; display: none; }
    .wow-week-select.visible { display: inline-block; }
    .wow-section { display: none; }
    .wow-section.active { display: block; }
    .wow-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .wow-kpi-card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .wow-kpi-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .wow-kpi-card .value { font-size: 20px; font-weight: 700; color: #0077b5; }
    .wow-kpi-card .prev { font-size: 12px; color: #9ca3af; margin-top: 2px; }
    .wow-change { font-size: 12px; font-weight: 600; margin-top: 2px; }
    .wow-change.positive { color: #059669; }
    .wow-change.negative { color: #dc2626; }
    .wow-change.neutral { color: #6b7280; }
    .wow-change.positive-down { color: #059669; }
    .wow-change.negative-up { color: #dc2626; }
    .wow-table-wrapper { overflow-x: auto; }
    .wow-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .wow-table th { text-align: left; padding: 10px 8px; background: #f9fafb; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
    .wow-table td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
    .wow-group-toggle { padding: 6px 12px; border: 1px solid #d1d5db; background: white; border-radius: 6px; font-size: 12px; cursor: pointer; margin-left: 12px; }
    .wow-group-toggle.active { background: #0077b5; color: white; border-color: #0077b5; }

    @media (max-width: 768px) {
      .container { padding: 16px; }
      .kpi-grid { grid-template-columns: repeat(3, 1fr); }
      .demo-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LinkedIn Ads Dashboard</h1>
    <div class="subtitle">${accountName} | ${startDate} to ${endDate}</div>
  </div>

  <div class="container">
    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-group-label">Campaign Group:</label>
        <select id="groupFilter" onchange="filterByGroup(this.value)" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;min-width:250px;">
          <option value="all">All Groups</option>
          ${campaignGroups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-separator"></div>
      <div class="filter-group">
        <label class="filter-group-label">Campaigns:</label>
        <div class="campaign-checklist" id="campaignChecklist">
          ${campaigns.map(c => `<label data-group-id="${c.campaignGroupId}"><input type="checkbox" value="${c.id}" checked onchange="onCampaignCheckChange()"> ${escapeHtml(c.name)}</label>`).join('')}
        </div>
        <div class="select-actions">
          <button onclick="selectAllCampaigns()">Select All</button>
          <button onclick="deselectAllCampaigns()">Deselect All</button>
        </div>
      </div>
      <div class="filter-separator"></div>
      <div class="filter-group">
        <label class="filter-group-label">View:</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="wow-toggle" id="wowToggleBtn" onclick="toggleWoW()">WoW View</button>
          <select class="wow-week-select" id="wowWeekSelect" onchange="updateWoWView()"></select>
        </div>
      </div>
      <span id="filterInfo" style="color: #6b7280; font-size: 13px; align-self: center;"></span>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" id="kpiGrid">
      <div class="kpi-card"><div class="label">Impressions</div><div class="value" id="kpi-impressions">${totals.impressions.toLocaleString()}</div></div>
      <div class="kpi-card"><div class="label">Reach</div><div class="value" id="kpi-reach">${totals.reach.toLocaleString()}</div></div>
      <div class="kpi-card"><div class="label">Frequency</div><div class="value" id="kpi-frequency">${frequency}</div></div>
      <div class="kpi-card"><div class="label">Clicks</div><div class="value" id="kpi-clicks">${totals.clicks.toLocaleString()}</div></div>
      <div class="kpi-card"><div class="label">CTR</div><div class="value" id="kpi-ctr">${ctr}%</div></div>
      <div class="kpi-card"><div class="label">Engagements</div><div class="value" id="kpi-engagements">${totals.engagements.toLocaleString()}</div></div>
      <div class="kpi-card"><div class="label">Eng Rate</div><div class="value" id="kpi-engrate">${engRate}%</div></div>
      <div class="kpi-card"><div class="label">Spend</div><div class="value" id="kpi-spend">$${totals.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
      <div class="kpi-card"><div class="label">CPM</div><div class="value" id="kpi-cpm">$${cpm}</div></div>
      <div class="kpi-card"><div class="label">Conversions</div><div class="value" id="kpi-conversions">${totals.conversions.toLocaleString()}</div></div>
      <div class="kpi-card"><div class="label">Conv Rate</div><div class="value" id="kpi-convrate">${convRate}%</div></div>
      <div class="kpi-card"><div class="label">Aud. Penetration</div><div class="value" id="kpi-audpen">${(() => {
        const withAp = campaigns.filter(c => c.audiencePenetration != null);
        if (withAp.length === 0) return '-';
        const totalImpr = withAp.reduce((s, c) => s + c.impressions, 0);
        if (totalImpr === 0) return '-';
        const weightedAp = withAp.reduce((s, c) => s + parseFloat(c.audiencePenetration!) * c.impressions, 0) / totalImpr;
        return weightedAp.toFixed(2) + '%';
      })()}</div></div>
    </div>

    <!-- Performance Trend -->
    <div class="section" id="trendSection">
      <h2>Performance Trend (90 Days)</h2>
      <div class="chart-container"><canvas id="trendChart"></canvas></div>
    </div>

    <!-- WoW KPI Section (hidden by default) -->
    <div class="wow-section" id="wowKpiSection"></div>

    <!-- WoW Table Section (hidden by default) -->
    <div class="wow-section" id="wowTableSection">
      <div class="section">
        <h2 style="display:flex;align-items:center;">Week-over-Week Campaign Performance
          <button class="wow-group-toggle" id="wowGroupToggle" onclick="toggleWoWGrouping()">Group by Campaign Group</button>
        </h2>
        <div class="wow-table-wrapper" id="wowTableContent"></div>
      </div>
    </div>

    <!-- Main Tabs -->
    <div class="section" id="tabsSection">
      <div class="tabs">
        <button class="tab active" onclick="showTab('campaigns', this)">Campaigns (${campaigns.length})</button>
        <button class="tab" onclick="showTab('creatives', this)">Creatives (${creatives.length})</button>
        <button class="tab" onclick="showTab('conversions', this)">Conversions</button>
        <button class="tab" onclick="showTab('demographics', this)">Demographics</button>
      </div>

      <!-- Campaigns Tab -->
      <div id="campaigns-tab" class="tab-content active">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th class="number">Impressions</th>
                <th class="number">Reach</th>
                <th class="number">Freq</th>
                <th class="number">Clicks</th>
                <th class="number">CTR</th>
                <th class="number">Engage</th>
                <th class="number">Eng%</th>
                <th class="number">Spend</th>
                <th class="number">CPM</th>
                <th class="number">CPC</th>
                <th class="number">Conv</th>
                <th class="number">Conv%</th>
                <th class="number">Cost/Conv</th>
                <th class="number">Aud. Pen.</th>
              </tr>
            </thead>
            <tbody id="campaignsTableBody">
              ${campaigns.map(c => `
              <tr data-campaign-id="${c.id}">
                <td><strong>${escapeHtml(c.name)}</strong><br><small style="color:#9ca3af">ID: ${c.id}</small></td>
                <td><span class="status ${c.status.toLowerCase()}">${c.status}</span></td>
                <td class="number">${c.impressions.toLocaleString()}</td>
                <td class="number">${c.reach.toLocaleString()}</td>
                <td class="number">${c.frequency}</td>
                <td class="number">${c.clicks.toLocaleString()}</td>
                <td class="number">${c.ctr}%</td>
                <td class="number">${c.engagements.toLocaleString()}</td>
                <td class="number">${c.engagementRate}%</td>
                <td class="number">$${c.cost}</td>
                <td class="number">$${c.cpm}</td>
                <td class="number">$${c.cpc}</td>
                <td class="number">${c.conversions}</td>
                <td class="number">${c.conversionRate}%</td>
                <td class="number">${c.costPerConversion === 'N/A' ? 'N/A' : '$' + c.costPerConversion}</td>
                <td class="number">${c.audiencePenetration != null ? c.audiencePenetration + '%' : '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Creatives Tab -->
      <div id="creatives-tab" class="tab-content">
        <div class="creative-sub-tabs">
          <button class="creative-sub-tab active" onclick="showCreativeView('all', this)">All Creatives</button>
          <button class="creative-sub-tab" onclick="showCreativeView('product', this)">By Product</button>
          <button class="creative-sub-tab" onclick="showCreativeView('segment', this)">By Segment</button>
          <button class="creative-sub-tab" onclick="showCreativeView('format', this)">By Format</button>
          <button class="creative-sub-tab" onclick="showCreativeView('ratio', this)">By Image Ratio</button>
          <button class="creative-sub-tab" onclick="showCreativeView('messages', this)">Best Messages</button>
          <button class="creative-sub-tab" onclick="showCreativeView('formats', this)">Best Formats</button>
        </div>

        <!-- All Creatives view -->
        <div id="creative-view-all" class="creative-view active">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Creative</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th class="number">Impressions</th>
                  <th class="number">Reach</th>
                  <th class="number">Freq</th>
                  <th class="number">Clicks</th>
                  <th class="number">CTR</th>
                  <th class="number">Engage</th>
                  <th class="number">Eng%</th>
                  <th class="number">Spend</th>
                  <th class="number">CPM</th>
                  <th class="number">CPC</th>
                  <th class="number">Conv</th>
                  <th class="number">Conv%</th>
                  <th class="number">Cost/Conv</th>
                  <th class="number">Aud. Pen.</th>
                </tr>
              </thead>
              <tbody id="creativesTableBody">
                ${creatives.map((c, idx) => {
                  const hasImage = c.imageUrl && c.imageUrl.length > 0;
                  return `
                <tr class="clickable" data-campaign-id="${c.campaignId}" onclick="openCreativeModal(${idx})">
                  <td>
                    <div class="creative-info">
                      ${hasImage
                        ? `<img src="${escapeHtml(c.imageUrl)}" class="creative-thumb" alt="" onerror="this.outerHTML='<div class=creative-thumb-placeholder><svg width=20 height=20 viewBox=\\'0 0 24 24\\' fill=none stroke=#9ca3af stroke-width=1.5><rect x=3 y=3 width=18 height=18 rx=2/></svg></div>'">`
                        : `<div class="creative-thumb-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>`
                      }
                      <div>
                        <div class="creative-name" title="${escapeHtml(c.headline)}">${escapeHtml(c.headline) || 'Creative ' + c.id}</div>
                        <div style="color:#9ca3af;font-size:10px;">ID: ${c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="creative-campaign">${escapeHtml(c.campaignName) || '-'}</span></td>
                  <td><span class="type-badge">${c.type}</span></td>
                  <td><span class="status ${c.status.toLowerCase()}">${c.status}</span></td>
                  <td class="number">${c.impressions.toLocaleString()}</td>
                  <td class="number">${c.reach.toLocaleString()}</td>
                  <td class="number">${c.frequency}</td>
                  <td class="number">${c.clicks.toLocaleString()}</td>
                  <td class="number">${c.ctr}%</td>
                  <td class="number">${c.engagements.toLocaleString()}</td>
                  <td class="number">${c.engagementRate}%</td>
                  <td class="number">$${c.cost}</td>
                  <td class="number">$${c.cpm}</td>
                  <td class="number">$${c.cpc}</td>
                  <td class="number">${c.conversions}</td>
                  <td class="number">${c.conversionRate}%</td>
                  <td class="number">${c.costPerConversion === 'N/A' ? 'N/A' : '$' + c.costPerConversion}</td>
                  <td class="number">${c.audiencePenetration != null ? c.audiencePenetration + '%' : '-'}</td>
                </tr>
                `;}).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- By Product view -->
        <div id="creative-view-product" class="creative-view"></div>
        <!-- By Segment view -->
        <div id="creative-view-segment" class="creative-view"></div>
        <!-- By Format view -->
        <div id="creative-view-format" class="creative-view"></div>
        <!-- By Image Ratio view -->
        <div id="creative-view-ratio" class="creative-view"></div>
        <!-- Best Messages view -->
        <div id="creative-view-messages" class="creative-view"></div>
        <!-- Best Formats view -->
        <div id="creative-view-formats" class="creative-view"></div>
      </div>

      <!-- Conversions Tab -->
      <div id="conversions-tab" class="tab-content">
        <div id="conversionsContent" class="conv-grid"></div>
        <div id="noConversionsMsg" style="display:none; text-align:center; padding:40px; color:#6b7280;">
          No conversion data available for the selected campaigns.
        </div>
      </div>

      <!-- Demographics Tab -->
      <div id="demographics-tab" class="tab-content">
        <div class="demo-grid" id="demographicsGrid"></div>
      </div>
    </div>
  </div>

  <!-- Creative Modal -->
  <div id="creativeModal" class="modal" onclick="if(event.target===this)closeModal()">
    <div class="modal-content">
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <div id="modalContent"></div>
    </div>
  </div>

  <script>
    const creatives = ${JSON.stringify(creatives)};
    const campaigns = ${JSON.stringify(campaigns)};
    const dailyData = ${JSON.stringify(dailyData)};
    const conversionData = ${JSON.stringify(conversionData)};
    const campaignGroups = ${JSON.stringify(campaignGroups)};
    const perCampaignDemographics = ${JSON.stringify(perCampaignDemographics)};

    // Filter state
    const filterState = {
      selectedGroupId: 'all',
      selectedCampaignIds: new Set(campaigns.map(c => c.id)),
    };

    function formatNumber(n) {
      if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n/1000).toFixed(1) + 'K';
      return n.toString();
    }

    function escapeHtmlJS(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function showTab(tabName, btn) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
      document.getElementById(tabName + '-tab').classList.add('active');
      if (btn) btn.classList.add('active');
    }

    // ==================== Filter Functions ====================

    function filterByGroup(groupId) {
      filterState.selectedGroupId = groupId;
      const checklist = document.getElementById('campaignChecklist');
      const labels = checklist.querySelectorAll('label');

      if (groupId === 'all') {
        labels.forEach(label => {
          label.style.display = '';
          label.querySelector('input').checked = true;
        });
        filterState.selectedCampaignIds = new Set(campaigns.map(c => c.id));
      } else {
        filterState.selectedCampaignIds.clear();
        labels.forEach(label => {
          const checkbox = label.querySelector('input');
          const campaignId = checkbox.value;
          const campaign = campaigns.find(c => c.id === campaignId);
          if (campaign && campaign.campaignGroupId === groupId) {
            label.style.display = '';
            checkbox.checked = true;
            filterState.selectedCampaignIds.add(campaignId);
          } else {
            label.style.display = 'none';
            checkbox.checked = false;
          }
        });
      }
      applyFilters();
    }

    function onCampaignCheckChange() {
      const checklist = document.getElementById('campaignChecklist');
      const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
      filterState.selectedCampaignIds.clear();
      checkboxes.forEach(cb => {
        if (cb.checked) filterState.selectedCampaignIds.add(cb.value);
      });
      applyFilters();
    }

    function selectAllCampaigns() {
      const checklist = document.getElementById('campaignChecklist');
      checklist.querySelectorAll('label').forEach(label => {
        if (label.style.display !== 'none') {
          const cb = label.querySelector('input');
          cb.checked = true;
          filterState.selectedCampaignIds.add(cb.value);
        }
      });
      applyFilters();
    }

    function deselectAllCampaigns() {
      const checklist = document.getElementById('campaignChecklist');
      checklist.querySelectorAll('label').forEach(label => {
        if (label.style.display !== 'none') {
          const cb = label.querySelector('input');
          cb.checked = false;
          filterState.selectedCampaignIds.delete(cb.value);
        }
      });
      applyFilters();
    }

    function applyFilters() {
      const selectedIds = filterState.selectedCampaignIds;
      const isFiltered = selectedIds.size < campaigns.length;

      // 1. Filter Campaigns table
      document.getElementById('campaignsTableBody').querySelectorAll('tr').forEach(el => {
        el.style.display = selectedIds.has(el.dataset.campaignId) ? '' : 'none';
      });

      // 2. Filter Creatives table
      document.getElementById('creativesTableBody').querySelectorAll('tr').forEach(el => {
        el.style.display = selectedIds.has(el.dataset.campaignId) ? '' : 'none';
      });

      // 3. Update KPIs
      const filteredCampaigns = campaigns.filter(c => selectedIds.has(c.id));
      const filteredCreatives = creatives.filter(c => selectedIds.has(c.campaignId));
      updateKPIs(filteredCampaigns, filteredCreatives);

      // 4. Update chart
      updateChart(selectedIds);

      // 5. Update conversions tab
      renderConversions(selectedIds);

      // 6. Update demographics
      renderDemographics(selectedIds);

      // 7. Update creative grouped views
      refreshCreativeViews();

      // 8. Update WoW if active
      if (wowActive) updateWoWView();

      // 9. Update filter info
      const filterInfo = document.getElementById('filterInfo');
      filterInfo.textContent = isFiltered
        ? 'Showing ' + filteredCampaigns.length + ' of ' + campaigns.length + ' campaigns'
        : '';
    }

    // ==================== KPI Update ====================

    function updateKPIs(filteredCampaigns, filteredCreatives) {
      const totals = {
        impressions: filteredCampaigns.reduce((s, c) => s + c.impressions, 0),
        reach: filteredCampaigns.reduce((s, c) => s + c.reach, 0),
        clicks: filteredCampaigns.reduce((s, c) => s + c.clicks, 0),
        engagements: filteredCampaigns.reduce((s, c) => s + c.engagements, 0),
        cost: filteredCampaigns.reduce((s, c) => s + parseFloat(c.cost), 0),
        conversions: filteredCampaigns.reduce((s, c) => s + c.conversions, 0),
      };
      document.getElementById('kpi-impressions').textContent = totals.impressions.toLocaleString();
      document.getElementById('kpi-reach').textContent = totals.reach.toLocaleString();
      document.getElementById('kpi-frequency').textContent = totals.reach > 0 ? (totals.impressions / totals.reach).toFixed(2) : '0.00';
      document.getElementById('kpi-clicks').textContent = totals.clicks.toLocaleString();
      document.getElementById('kpi-ctr').textContent = (totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00') + '%';
      document.getElementById('kpi-engagements').textContent = totals.engagements.toLocaleString();
      document.getElementById('kpi-engrate').textContent = (totals.impressions > 0 ? ((totals.engagements / totals.impressions) * 100).toFixed(2) : '0.00') + '%';
      document.getElementById('kpi-spend').textContent = '$' + totals.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      document.getElementById('kpi-cpm').textContent = '$' + (totals.impressions > 0 ? ((totals.cost / totals.impressions) * 1000).toFixed(2) : '0.00');
      document.getElementById('kpi-conversions').textContent = totals.conversions.toLocaleString();
      document.getElementById('kpi-convrate').textContent = (totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : '0.00') + '%';

      // Audience Penetration (weighted average)
      const withAp = filteredCampaigns.filter(c => c.audiencePenetration != null);
      if (withAp.length === 0) {
        document.getElementById('kpi-audpen').textContent = '-';
      } else {
        const totalImpr = withAp.reduce((s, c) => s + c.impressions, 0);
        if (totalImpr === 0) {
          document.getElementById('kpi-audpen').textContent = '-';
        } else {
          const weightedAp = withAp.reduce((s, c) => s + parseFloat(c.audiencePenetration) * c.impressions, 0) / totalImpr;
          document.getElementById('kpi-audpen').textContent = weightedAp.toFixed(2) + '%';
        }
      }
    }

    // ==================== Chart ====================

    let trendChart;

    function aggregateDailyData(selectedIds) {
      const byDate = new Map();
      for (const d of dailyData) {
        if (!selectedIds.has(d.campaignId)) continue;
        if (!byDate.has(d.date)) {
          byDate.set(d.date, { date: d.date, impressions: 0, clicks: 0, cost: 0, conversions: 0 });
        }
        const agg = byDate.get(d.date);
        agg.impressions += d.impressions;
        agg.clicks += d.clicks;
        agg.cost += d.cost;
        agg.conversions += d.conversions;
      }
      return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    function initChart() {
      const aggregated = aggregateDailyData(new Set(campaigns.map(c => c.id)));
      const ctx = document.getElementById('trendChart').getContext('2d');
      trendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: aggregated.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
          datasets: [
            { label: 'Impressions', data: aggregated.map(d => d.impressions), borderColor: '#0077b5', backgroundColor: 'rgba(0,119,181,0.1)', fill: true, tension: 0.3, yAxisID: 'y' },
            { label: 'Clicks', data: aggregated.map(d => d.clicks), borderColor: '#00a0dc', backgroundColor: 'transparent', tension: 0.3, yAxisID: 'y1' },
            { label: 'Spend ($)', data: aggregated.map(d => d.cost), borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.3, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 15 } },
            y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Impressions' } },
            y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Clicks / Spend' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    function updateChart(selectedIds) {
      const aggregated = aggregateDailyData(selectedIds);
      trendChart.data.labels = aggregated.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      trendChart.data.datasets[0].data = aggregated.map(d => d.impressions);
      trendChart.data.datasets[1].data = aggregated.map(d => d.clicks);
      trendChart.data.datasets[2].data = aggregated.map(d => d.cost);
      trendChart.update();
    }

    // ==================== Conversions Tab ====================

    function renderConversions(selectedIds) {
      const container = document.getElementById('conversionsContent');
      const noDataMsg = document.getElementById('noConversionsMsg');

      const filtered = conversionData.filter(c => selectedIds.has(c.campaignId));

      if (filtered.length === 0) {
        container.innerHTML = '';
        noDataMsg.style.display = '';
        return;
      }
      noDataMsg.style.display = 'none';

      // Group by campaign
      const byCampaign = new Map();
      for (const record of filtered) {
        if (!byCampaign.has(record.campaignId)) {
          byCampaign.set(record.campaignId, { campaignName: record.campaignName, conversions: [], totalConversions: 0 });
        }
        const entry = byCampaign.get(record.campaignId);
        entry.conversions.push(record);
        entry.totalConversions += record.totalConversions;
      }

      let html = '';
      for (const [campaignId, entry] of byCampaign) {
        if (entry.totalConversions === 0) continue;
        entry.conversions.sort((a, b) => b.totalConversions - a.totalConversions);

        html += '<div class="conv-campaign-card">';
        html += '<h3>' + escapeHtmlJS(entry.campaignName) + ' <span style="color:#6b7280;font-weight:400;font-size:12px;">(' + entry.totalConversions + ' total)</span></h3>';
        html += '<table class="demo-table"><thead><tr>';
        html += '<th>Conversion Action</th><th class="number">Total</th><th class="number">Post-Click</th><th class="number">Post-View</th><th class="number">Value</th><th class="number">Cost</th><th class="number">Cost/Conv</th><th>Distribution</th>';
        html += '</tr></thead><tbody>';

        for (const c of entry.conversions) {
          const barWidth = entry.totalConversions > 0 ? ((c.totalConversions / entry.totalConversions) * 100) : 0;
          const costPerConv = c.totalConversions > 0 ? (c.cost / c.totalConversions).toFixed(2) : 'N/A';
          html += '<tr>';
          html += '<td><strong>' + escapeHtmlJS(c.conversionName) + '</strong></td>';
          html += '<td class="number">' + c.totalConversions + '</td>';
          html += '<td class="number">' + c.postClickConversions + '</td>';
          html += '<td class="number">' + c.postViewConversions + '</td>';
          html += '<td class="number">$' + c.conversionValue.toFixed(2) + '</td>';
          html += '<td class="number">$' + c.cost.toFixed(2) + '</td>';
          html += '<td class="number">' + (costPerConv === 'N/A' ? 'N/A' : '$' + costPerConv) + '</td>';
          html += '<td class="demo-bar-cell"><div class="demo-bar-container"><div class="demo-bar" style="width:' + barWidth + '%"></div></div></td>';
          html += '</tr>';
        }

        html += '</tbody></table></div>';
      }

      container.innerHTML = html;
    }

    // ==================== Creative Modal ====================

    function openCreativeModal(idx) {
      const c = creatives[idx];
      const modal = document.getElementById('creativeModal');
      const content = document.getElementById('modalContent');

      content.innerHTML = \`
        \${c.imageUrl ? \`<img src="\${c.imageUrl}" class="modal-image" alt="\${c.headline}">\` : ''}
        <div class="modal-body">
          <h2>\${c.headline || 'Creative ' + c.id}</h2>
          \${c.primaryText ? \`<div class="full-text">\${c.primaryText}</div>\` : ''}
          \${c.landingPageUrl ? \`<div class="landing-url"><strong>Landing Page:</strong> <a href="\${c.landingPageUrl}" target="_blank">\${c.landingPageUrl}</a></div>\` : ''}
          <div style="margin-bottom: 16px;">
            <span class="status \${c.status.toLowerCase()}">\${c.status}</span>
            <span class="type-badge" style="margin-left: 8px;">\${c.type}</span>
            \${c.campaignName ? \`<span style="margin-left: 8px; color: #6b7280;">Campaign: \${c.campaignName}</span>\` : ''}
          </div>

          <h3 style="font-size: 14px; margin-bottom: 12px; color: #374151;">Performance Metrics</h3>
          <div class="modal-metrics-grid">
            <div class="modal-metric"><div class="value">\${c.impressions.toLocaleString()}</div><div class="label">Impressions</div></div>
            <div class="modal-metric"><div class="value">\${c.reach.toLocaleString()}</div><div class="label">Reach</div></div>
            <div class="modal-metric"><div class="value">\${c.frequency}</div><div class="label">Frequency</div></div>
            <div class="modal-metric"><div class="value">\${c.clicks.toLocaleString()}</div><div class="label">Clicks</div></div>
            <div class="modal-metric"><div class="value">\${c.ctr}%</div><div class="label">CTR</div></div>
            <div class="modal-metric"><div class="value">\${c.engagements.toLocaleString()}</div><div class="label">Engagements</div></div>
            <div class="modal-metric"><div class="value">\${c.engagementRate}%</div><div class="label">Eng Rate</div></div>
            <div class="modal-metric"><div class="value">$\${c.cost}</div><div class="label">Spend</div></div>
            <div class="modal-metric"><div class="value">$\${c.cpm}</div><div class="label">CPM</div></div>
            <div class="modal-metric"><div class="value">$\${c.cpc}</div><div class="label">CPC</div></div>
            <div class="modal-metric"><div class="value">\${c.conversions}</div><div class="label">Conversions</div></div>
            <div class="modal-metric"><div class="value">\${c.conversionRate}%</div><div class="label">Conv Rate</div></div>
            <div class="modal-metric"><div class="value">\${c.costPerConversion === 'N/A' ? 'N/A' : '$' + c.costPerConversion}</div><div class="label">Cost/Conv</div></div>
            <div class="modal-metric"><div class="value">\${c.audiencePenetration != null ? c.audiencePenetration + '%' : '-'}</div><div class="label">Aud. Pen.</div></div>
          </div>

          <h3 style="font-size: 14px; margin: 20px 0 12px; color: #374151;">Engagement Breakdown</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; background: #f0fdf4; border-radius: 8px;">
            <div style="text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #059669;">\${c.likes}</div><div style="font-size: 11px; color: #6b7280;">Likes</div></div>
            <div style="text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #059669;">\${c.comments}</div><div style="font-size: 11px; color: #6b7280;">Comments</div></div>
            <div style="text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #059669;">\${c.shares}</div><div style="font-size: 11px; color: #6b7280;">Shares</div></div>
          </div>

          \${c.videoViews > 0 ? \`
          <h3 style="font-size: 14px; margin: 20px 0 12px; color: #374151;">Video Metrics</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; background: #fdf4ff; border-radius: 8px;">
            <div style="text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #9333ea;">\${c.videoViews.toLocaleString()}</div><div style="font-size: 11px; color: #6b7280;">Views</div></div>
            <div style="text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #9333ea;">\${c.videoCompletions.toLocaleString()}</div><div style="font-size: 11px; color: #6b7280;">Completions</div></div>
            <div style="text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #9333ea;">\${c.videoCompletionRate}%</div><div style="font-size: 11px; color: #6b7280;">Completion Rate</div></div>
          </div>\` : ''}
        </div>
      \`;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      document.getElementById('creativeModal').classList.remove('active');
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ==================== Demographics Rendering ====================

    function renderDemographics(selectedIds) {
      const container = document.getElementById('demographicsGrid');
      const demoTypes = [
        { key: 'jobFunction', title: 'Job Function' },
        { key: 'seniority', title: 'Seniority Level' },
        { key: 'industry', title: 'Industry' },
        { key: 'companySize', title: 'Company Size' },
        { key: 'country', title: 'Country' },
      ];

      let html = '';
      for (const { key, title } of demoTypes) {
        // Merge entries across selected campaigns
        const merged = new Map();
        for (const cid of selectedIds) {
          const entries = (perCampaignDemographics[cid] || {})[key] || [];
          for (const e of entries) {
            if (!merged.has(e.name)) {
              merged.set(e.name, { name: e.name, impressions: 0, reach: 0, clicks: 0, cost: 0, conversions: 0, engagements: 0 });
            }
            const m = merged.get(e.name);
            m.impressions += e.impressions || 0;
            m.reach += e.reach || 0;
            m.clicks += e.clicks || 0;
            m.cost += e.cost || 0;
            m.conversions += e.conversions || 0;
            m.engagements += e.engagements || 0;
          }
        }

        let sorted = Array.from(merged.values()).sort((a, b) => b.impressions - a.impressions).slice(0, 20);
        if (sorted.length === 0) {
          html += '<div class="demo-section"><h3>' + title + '</h3><p style="color:#6b7280;font-size:14px;">No data available</p></div>';
          continue;
        }

        const maxImp = Math.max(...sorted.map(d => d.impressions));
        html += '<div class="demo-section"><h3>' + title + '</h3>';
        html += '<table class="demo-table"><thead><tr>';
        html += '<th>' + title + '</th><th>Impressions</th><th>Distribution</th><th>Reach</th><th>Clicks</th><th>CTR</th><th>Eng%</th><th>Spend</th><th>Conv</th>';
        html += '</tr></thead><tbody>';

        for (const d of sorted) {
          const barWidth = maxImp > 0 ? ((d.impressions / maxImp) * 100) : 0;
          const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00';
          const engRate = d.impressions > 0 ? ((d.engagements / d.impressions) * 100).toFixed(2) : '0.00';
          const cost = d.cost.toFixed(2);
          html += '<tr>';
          html += '<td><strong>' + escapeHtmlJS(d.name) + '</strong></td>';
          html += '<td class="number">' + formatNumber(d.impressions) + '</td>';
          html += '<td class="demo-bar-cell"><div class="demo-bar-container"><div class="demo-bar" style="width:' + barWidth + '%"></div></div></td>';
          html += '<td class="number">' + formatNumber(d.reach) + '</td>';
          html += '<td class="number">' + formatNumber(d.clicks) + '</td>';
          html += '<td class="number">' + ctr + '%</td>';
          html += '<td class="number">' + engRate + '%</td>';
          html += '<td class="number">$' + cost + '</td>';
          html += '<td class="number">' + d.conversions + '</td>';
          html += '</tr>';
        }

        html += '</tbody></table></div>';
      }

      container.innerHTML = html;
    }

    // ==================== WoW (Week-over-Week) View ====================

    let wowActive = false;
    let wowGrouped = false;

    function getAvailableWeeks() {
      const dates = new Set();
      for (const d of dailyData) dates.add(d.date);
      const sortedDates = Array.from(dates).sort();
      if (sortedDates.length === 0) return [];

      // Find all Monday-start weeks
      const weeks = [];
      let current = new Date(sortedDates[0]);
      // Move to Monday
      const day = current.getDay();
      const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
      current.setDate(current.getDate() + diff);

      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      while (current <= lastDate) {
        const mon = new Date(current);
        const sun = new Date(current);
        sun.setDate(sun.getDate() + 6);
        const monStr = mon.toISOString().split('T')[0];
        const sunStr = sun.toISOString().split('T')[0];
        // Check if we have data for at least 1 day in this week
        const hasData = sortedDates.some(d => d >= monStr && d <= sunStr);
        if (hasData) {
          weeks.push({
            label: 'W/C ' + mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            start: monStr,
            end: sunStr,
          });
        }
        current.setDate(current.getDate() + 7);
      }
      return weeks;
    }

    function toggleWoW() {
      wowActive = !wowActive;
      const btn = document.getElementById('wowToggleBtn');
      const weekSelect = document.getElementById('wowWeekSelect');
      const kpiGrid = document.getElementById('kpiGrid');
      const trendSection = document.getElementById('trendSection');
      const tabsSection = document.getElementById('tabsSection');
      const wowKpiSection = document.getElementById('wowKpiSection');
      const wowTableSection = document.getElementById('wowTableSection');

      if (wowActive) {
        btn.classList.add('active');
        weekSelect.classList.add('visible');
        kpiGrid.style.display = 'none';
        trendSection.style.display = 'none';
        tabsSection.style.display = 'none';
        wowKpiSection.classList.add('active');
        wowTableSection.classList.add('active');

        // Populate week selector
        const weeks = getAvailableWeeks();
        weekSelect.innerHTML = weeks.map((w, i) => '<option value="' + i + '">' + w.label + '</option>').join('');
        // Default to latest complete week (second to last if available)
        if (weeks.length >= 2) weekSelect.value = String(weeks.length - 2);
        else if (weeks.length === 1) weekSelect.value = '0';

        updateWoWView();
      } else {
        btn.classList.remove('active');
        weekSelect.classList.remove('visible');
        kpiGrid.style.display = '';
        trendSection.style.display = '';
        tabsSection.style.display = '';
        wowKpiSection.classList.remove('active');
        wowTableSection.classList.remove('active');
      }
    }

    function aggregateWeekData(startDate, endDate, selectedIds) {
      const totals = { impressions: 0, clicks: 0, cost: 0, conversions: 0, engagements: 0, reach: 0 };
      const byCampaign = new Map();

      for (const d of dailyData) {
        if (d.date < startDate || d.date > endDate) continue;
        if (!selectedIds.has(d.campaignId)) continue;

        totals.impressions += d.impressions;
        totals.clicks += d.clicks;
        totals.cost += d.cost;
        totals.conversions += d.conversions;
        totals.engagements += d.engagements || 0;
        totals.reach += d.reach || 0;

        if (!byCampaign.has(d.campaignId)) {
          const c = campaigns.find(c => c.id === d.campaignId);
          byCampaign.set(d.campaignId, {
            campaignId: d.campaignId,
            campaignName: c ? c.name : d.campaignId,
            campaignGroupId: c ? c.campaignGroupId : '',
            campaignGroupName: c ? c.campaignGroupName : '',
            impressions: 0, clicks: 0, cost: 0, conversions: 0, engagements: 0, reach: 0,
          });
        }
        const entry = byCampaign.get(d.campaignId);
        entry.impressions += d.impressions;
        entry.clicks += d.clicks;
        entry.cost += d.cost;
        entry.conversions += d.conversions;
        entry.engagements += d.engagements || 0;
        entry.reach += d.reach || 0;
      }

      return { totals, byCampaign };
    }

    function calcChange(current, previous) {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    }

    function changeHtml(change, metric) {
      // For cost metrics, lower is better
      const costMetrics = ['cost', 'cpm', 'cpc', 'costPerConversion'];
      const invertColor = costMetrics.includes(metric);
      const arrow = change > 0 ? '&#9650;' : change < 0 ? '&#9660;' : '&#8211;';
      let cls = 'neutral';
      if (change > 0.5) cls = invertColor ? 'negative' : 'positive';
      else if (change < -0.5) cls = invertColor ? 'positive' : 'negative';
      return '<span class="wow-change ' + cls + '">' + arrow + ' ' + Math.abs(change).toFixed(1) + '%</span>';
    }

    function updateWoWView() {
      const weeks = getAvailableWeeks();
      const selectedIdx = parseInt(document.getElementById('wowWeekSelect').value);
      if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= weeks.length) return;

      const currentWeek = weeks[selectedIdx];
      const prevWeek = selectedIdx > 0 ? weeks[selectedIdx - 1] : null;

      const selectedIds = filterState.selectedCampaignIds;
      const current = aggregateWeekData(currentWeek.start, currentWeek.end, selectedIds);
      const previous = prevWeek ? aggregateWeekData(prevWeek.start, prevWeek.end, selectedIds) : null;

      renderWoWKpis(current.totals, previous ? previous.totals : null, currentWeek, prevWeek);
      renderWoWTable(current.byCampaign, previous ? previous.byCampaign : null);
    }

    function renderWoWKpis(curr, prev, currentWeek, prevWeek) {
      const container = document.getElementById('wowKpiSection');
      const ctr = curr.impressions > 0 ? ((curr.clicks / curr.impressions) * 100) : 0;
      const engRate = curr.impressions > 0 ? ((curr.engagements / curr.impressions) * 100) : 0;
      const cpm = curr.impressions > 0 ? ((curr.cost / curr.impressions) * 1000) : 0;
      const cpc = curr.clicks > 0 ? (curr.cost / curr.clicks) : 0;
      const convRate = curr.clicks > 0 ? ((curr.conversions / curr.clicks) * 100) : 0;

      const prevCtr = prev && prev.impressions > 0 ? ((prev.clicks / prev.impressions) * 100) : 0;
      const prevEngRate = prev && prev.impressions > 0 ? ((prev.engagements / prev.impressions) * 100) : 0;
      const prevCpm = prev && prev.impressions > 0 ? ((prev.cost / prev.impressions) * 1000) : 0;
      const prevCpc = prev && prev.clicks > 0 ? (prev.cost / prev.clicks) : 0;
      const prevConvRate = prev && prev.clicks > 0 ? ((prev.conversions / prev.clicks) * 100) : 0;

      const metrics = [
        { label: 'Impressions', value: curr.impressions.toLocaleString(), prevValue: prev ? prev.impressions.toLocaleString() : '-', change: prev ? calcChange(curr.impressions, prev.impressions) : null, metric: 'impressions' },
        { label: 'Clicks', value: curr.clicks.toLocaleString(), prevValue: prev ? prev.clicks.toLocaleString() : '-', change: prev ? calcChange(curr.clicks, prev.clicks) : null, metric: 'clicks' },
        { label: 'CTR', value: ctr.toFixed(2) + '%', prevValue: prev ? prevCtr.toFixed(2) + '%' : '-', change: prev ? calcChange(ctr, prevCtr) : null, metric: 'ctr' },
        { label: 'Engagements', value: curr.engagements.toLocaleString(), prevValue: prev ? prev.engagements.toLocaleString() : '-', change: prev ? calcChange(curr.engagements, prev.engagements) : null, metric: 'engagements' },
        { label: 'Eng Rate', value: engRate.toFixed(2) + '%', prevValue: prev ? prevEngRate.toFixed(2) + '%' : '-', change: prev ? calcChange(engRate, prevEngRate) : null, metric: 'engRate' },
        { label: 'Spend', value: '$' + curr.cost.toFixed(2), prevValue: prev ? '$' + prev.cost.toFixed(2) : '-', change: prev ? calcChange(curr.cost, prev.cost) : null, metric: 'cost' },
        { label: 'CPM', value: '$' + cpm.toFixed(2), prevValue: prev ? '$' + prevCpm.toFixed(2) : '-', change: prev ? calcChange(cpm, prevCpm) : null, metric: 'cpm' },
        { label: 'CPC', value: '$' + cpc.toFixed(2), prevValue: prev ? '$' + prevCpc.toFixed(2) : '-', change: prev ? calcChange(cpc, prevCpc) : null, metric: 'cpc' },
        { label: 'Conversions', value: curr.conversions.toLocaleString(), prevValue: prev ? prev.conversions.toLocaleString() : '-', change: prev ? calcChange(curr.conversions, prev.conversions) : null, metric: 'conversions' },
        { label: 'Conv Rate', value: convRate.toFixed(2) + '%', prevValue: prev ? prevConvRate.toFixed(2) + '%' : '-', change: prev ? calcChange(convRate, prevConvRate) : null, metric: 'convRate' },
      ];

      let html = '<div class="wow-kpi-grid">';
      for (const m of metrics) {
        html += '<div class="wow-kpi-card">';
        html += '<div class="label">' + m.label + '</div>';
        html += '<div class="value">' + m.value + '</div>';
        html += '<div class="prev">Prev: ' + m.prevValue + '</div>';
        if (m.change !== null) html += changeHtml(m.change, m.metric);
        html += '</div>';
      }
      html += '</div>';

      container.innerHTML = html;
    }

    function renderWoWTable(currentByCampaign, previousByCampaign) {
      const container = document.getElementById('wowTableContent');
      const allIds = new Set([...currentByCampaign.keys(), ...(previousByCampaign ? previousByCampaign.keys() : [])]);

      let rows = [];
      for (const id of allIds) {
        const curr = currentByCampaign.get(id) || { campaignName: id, campaignGroupId: '', campaignGroupName: '', impressions: 0, clicks: 0, cost: 0, conversions: 0 };
        const prev = previousByCampaign ? (previousByCampaign.get(id) || { impressions: 0, clicks: 0, cost: 0, conversions: 0 }) : null;
        rows.push({ id, curr, prev });
      }

      if (wowGrouped) {
        // Group by campaign group
        const groups = new Map();
        for (const r of rows) {
          const gid = r.curr.campaignGroupId || 'ungrouped';
          const gname = r.curr.campaignGroupName || 'Ungrouped';
          if (!groups.has(gid)) {
            groups.set(gid, { name: gname, curr: { impressions: 0, clicks: 0, cost: 0, conversions: 0 }, prev: { impressions: 0, clicks: 0, cost: 0, conversions: 0 } });
          }
          const g = groups.get(gid);
          g.curr.impressions += r.curr.impressions;
          g.curr.clicks += r.curr.clicks;
          g.curr.cost += r.curr.cost;
          g.curr.conversions += r.curr.conversions;
          if (r.prev) {
            g.prev.impressions += r.prev.impressions;
            g.prev.clicks += r.prev.clicks;
            g.prev.cost += r.prev.cost;
            g.prev.conversions += r.prev.conversions;
          }
        }

        rows = Array.from(groups.entries()).map(([gid, g]) => ({
          id: gid,
          curr: { campaignName: g.name, impressions: g.curr.impressions, clicks: g.curr.clicks, cost: g.curr.cost, conversions: g.curr.conversions },
          prev: previousByCampaign ? g.prev : null,
        }));
      }

      // Sort by current impressions desc
      rows.sort((a, b) => b.curr.impressions - a.curr.impressions);

      let html = '<table class="wow-table"><thead><tr>';
      html += '<th>' + (wowGrouped ? 'Campaign Group' : 'Campaign') + '</th>';
      html += '<th class="number">Impr (This)</th><th class="number">Impr (Prev)</th><th class="number">Impr \u0394</th>';
      html += '<th class="number">Clicks (This)</th><th class="number">Clicks (Prev)</th><th class="number">Clicks \u0394</th>';
      html += '<th class="number">CTR (This)</th><th class="number">CTR (Prev)</th><th class="number">CTR \u0394</th>';
      html += '<th class="number">Spend (This)</th><th class="number">Spend (Prev)</th><th class="number">Spend \u0394</th>';
      html += '<th class="number">Conv (This)</th><th class="number">Conv (Prev)</th><th class="number">Conv \u0394</th>';
      html += '</tr></thead><tbody>';

      for (const r of rows) {
        const cCtr = r.curr.impressions > 0 ? ((r.curr.clicks / r.curr.impressions) * 100) : 0;
        const pCtr = r.prev && r.prev.impressions > 0 ? ((r.prev.clicks / r.prev.impressions) * 100) : 0;

        html += '<tr>';
        html += '<td><strong>' + escapeHtmlJS(r.curr.campaignName) + '</strong></td>';
        html += '<td class="number">' + r.curr.impressions.toLocaleString() + '</td>';
        html += '<td class="number">' + (r.prev ? r.prev.impressions.toLocaleString() : '-') + '</td>';
        html += '<td class="number">' + (r.prev ? changeHtml(calcChange(r.curr.impressions, r.prev.impressions), 'impressions') : '-') + '</td>';
        html += '<td class="number">' + r.curr.clicks.toLocaleString() + '</td>';
        html += '<td class="number">' + (r.prev ? r.prev.clicks.toLocaleString() : '-') + '</td>';
        html += '<td class="number">' + (r.prev ? changeHtml(calcChange(r.curr.clicks, r.prev.clicks), 'clicks') : '-') + '</td>';
        html += '<td class="number">' + cCtr.toFixed(2) + '%</td>';
        html += '<td class="number">' + (r.prev ? pCtr.toFixed(2) + '%' : '-') + '</td>';
        html += '<td class="number">' + (r.prev ? changeHtml(calcChange(cCtr, pCtr), 'ctr') : '-') + '</td>';
        html += '<td class="number">$' + r.curr.cost.toFixed(2) + '</td>';
        html += '<td class="number">' + (r.prev ? '$' + r.prev.cost.toFixed(2) : '-') + '</td>';
        html += '<td class="number">' + (r.prev ? changeHtml(calcChange(r.curr.cost, r.prev.cost), 'cost') : '-') + '</td>';
        html += '<td class="number">' + r.curr.conversions + '</td>';
        html += '<td class="number">' + (r.prev ? r.prev.conversions : '-') + '</td>';
        html += '<td class="number">' + (r.prev ? changeHtml(calcChange(r.curr.conversions, r.prev.conversions), 'conversions') : '-') + '</td>';
        html += '</tr>';
      }

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    function toggleWoWGrouping() {
      wowGrouped = !wowGrouped;
      const btn = document.getElementById('wowGroupToggle');
      if (wowGrouped) btn.classList.add('active');
      else btn.classList.remove('active');
      updateWoWView();
    }

    // ==================== Creative Grouping & Views ====================

    function classifyCreative(c) {
      const cn = (c.campaignName || '').toLowerCase();
      const headline = c.headline || '';
      const parts = headline.split('|').map(function(s) { return s.trim(); });
      const hasPipeNaming = parts.length >= 4;

      // Product classification: from headline part 2 (IF=Infrastructure, MA=Meeting Agent) or campaign name
      let product = 'Other';
      if (hasPipeNaming) {
        const code = parts[1].toUpperCase();
        if (code === 'MA') product = 'Meeting Agent';
        else if (code === 'IF') product = 'Infrastructure';
        else product = code;
      } else {
        if (cn.includes('meeting-agent') || cn.includes('meeting agent')) product = 'Meeting Agent';
        else if (cn.includes('infrastructure')) product = 'Infrastructure';
        else if (cn.includes('api') || cn.includes('scheduling') || cn.includes('integration') || cn.includes('paycor') || cn.includes('heal.me') || cn.includes('nylas') || cn.includes('eoy') || cn.includes('competitor') || cn.includes('hr tech') || cn.includes('nurturing') || cn.includes('buyer')) product = 'Scheduling';
      }

      // Segment classification: from headline part 3 or campaign name
      let segment = 'Other';
      if (hasPipeNaming) {
        segment = parts[2] || 'Other';
      } else {
        if (cn.includes('hr tech') || cn.includes('paycor') || cn.includes('workday')) segment = 'HR Tech';
        else if (cn.includes('crm') || cn.includes('heal.me') || cn.includes('nylas')) segment = 'CRM';
        else segment = 'Agnostic';
      }

      // Format classification (from campaign name + creative type)
      let format = c.type || 'IMAGE';
      if (cn.includes('carousel') || (hasPipeNaming && parts[parts.length - 1].toLowerCase() === 'carousel')) format = 'Carousel';
      else if (format === 'VIDEO' || c.videoViews > 0) format = 'Video';
      else if (format === 'INMAIL' || format === 'TEXT') format = format.charAt(0) + format.slice(1).toLowerCase();
      else format = 'Single Image';

      // Image ratio: from headline last part (Vertical, Square, Landscape only)
      let imageRatio = null;
      if (hasPipeNaming) {
        const last = parts[parts.length - 1].toLowerCase().replace('sqiare', 'square');
        if (last === 'vertical' || last === 'square' || last === 'landscape') {
          imageRatio = last.charAt(0).toUpperCase() + last.slice(1);
        }
      }

      return { product, segment, format, imageRatio };
    }

    function getFilteredCreatives() {
      return creatives.filter(c => filterState.selectedCampaignIds.has(c.campaignId));
    }

    function aggregateGroup(items) {
      const impressions = items.reduce((s, c) => s + c.impressions, 0);
      const clicks = items.reduce((s, c) => s + c.clicks, 0);
      const engagements = items.reduce((s, c) => s + c.engagements, 0);
      const cost = items.reduce((s, c) => s + parseFloat(c.cost), 0);
      const conversions = items.reduce((s, c) => s + c.conversions, 0);
      const reach = items.reduce((s, c) => s + c.reach, 0);
      return {
        count: items.length,
        impressions, clicks, engagements, cost, conversions, reach,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
        engRate: impressions > 0 ? ((engagements / impressions) * 100).toFixed(2) : '0.00',
        cpm: impressions > 0 ? ((cost / impressions) * 1000).toFixed(2) : '0.00',
        cpc: clicks > 0 ? (cost / clicks).toFixed(2) : '0.00',
        convRate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00',
        costPerConv: conversions > 0 ? (cost / conversions).toFixed(2) : 'N/A',
      };
    }

    function renderGroupedView(containerId, groupKey) {
      const container = document.getElementById(containerId);
      const filtered = getFilteredCreatives();
      const groups = new Map();

      for (const c of filtered) {
        const cls = classifyCreative(c);
        const key = cls[groupKey];
        if (key == null) continue; // skip creatives without this classification (e.g. no image ratio)
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      }

      if (groups.size === 0) {
        container.innerHTML = '<p style="color:#6b7280;text-align:center;padding:40px;">No creatives for selected campaigns.</p>';
        return;
      }

      // Sort groups by total impressions
      const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
        const aImp = a[1].reduce((s, c) => s + c.impressions, 0);
        const bImp = b[1].reduce((s, c) => s + c.impressions, 0);
        return bImp - aImp;
      });

      let html = '<div class="group-summary-grid">';
      for (const [name, items] of sortedGroups) {
        const agg = aggregateGroup(items);
        html += '<div class="group-card">';
        html += '<h3>' + escapeHtmlJS(name) + ' <span style="color:#6b7280;font-weight:400;font-size:12px;">(' + agg.count + ' creatives)</span></h3>';
        html += '<div class="group-metrics">';
        html += '<div class="gm"><div class="val">' + agg.impressions.toLocaleString() + '</div><div class="lbl">Impressions</div></div>';
        html += '<div class="gm"><div class="val">' + agg.clicks.toLocaleString() + '</div><div class="lbl">Clicks</div></div>';
        html += '<div class="gm"><div class="val">' + agg.ctr + '%</div><div class="lbl">CTR</div></div>';
        html += '<div class="gm"><div class="val">' + agg.engRate + '%</div><div class="lbl">Eng Rate</div></div>';
        html += '<div class="gm"><div class="val">$' + agg.cost.toFixed(2) + '</div><div class="lbl">Spend</div></div>';
        html += '<div class="gm"><div class="val">$' + agg.cpm + '</div><div class="lbl">CPM</div></div>';
        html += '<div class="gm"><div class="val">$' + agg.cpc + '</div><div class="lbl">CPC</div></div>';
        html += '<div class="gm"><div class="val">' + agg.conversions + '</div><div class="lbl">Conversions</div></div>';
        html += '<div class="gm"><div class="val">' + (agg.costPerConv === 'N/A' ? 'N/A' : '$' + agg.costPerConv) + '</div><div class="lbl">Cost/Conv</div></div>';
        html += '</div></div>';
      }
      html += '</div>';

      // Comparison table
      html += '<div class="table-wrapper"><table><thead><tr>';
      const groupLabel = groupKey === 'product' ? 'Product' : groupKey === 'segment' ? 'Segment' : groupKey === 'imageRatio' ? 'Image Ratio' : 'Format';
      html += '<th>' + groupLabel + '</th>';
      html += '<th class="number">Creatives</th><th class="number">Impressions</th><th class="number">Reach</th><th class="number">Clicks</th><th class="number">CTR</th><th class="number">Eng%</th><th class="number">Spend</th><th class="number">CPM</th><th class="number">CPC</th><th class="number">Conv</th><th class="number">Conv%</th><th class="number">Cost/Conv</th>';
      html += '</tr></thead><tbody>';
      for (const [name, items] of sortedGroups) {
        const agg = aggregateGroup(items);
        html += '<tr>';
        html += '<td><strong>' + escapeHtmlJS(name) + '</strong></td>';
        html += '<td class="number">' + agg.count + '</td>';
        html += '<td class="number">' + agg.impressions.toLocaleString() + '</td>';
        html += '<td class="number">' + agg.reach.toLocaleString() + '</td>';
        html += '<td class="number">' + agg.clicks.toLocaleString() + '</td>';
        html += '<td class="number">' + agg.ctr + '%</td>';
        html += '<td class="number">' + agg.engRate + '%</td>';
        html += '<td class="number">$' + agg.cost.toFixed(2) + '</td>';
        html += '<td class="number">$' + agg.cpm + '</td>';
        html += '<td class="number">$' + agg.cpc + '</td>';
        html += '<td class="number">' + agg.conversions + '</td>';
        html += '<td class="number">' + agg.convRate + '%</td>';
        html += '<td class="number">' + (agg.costPerConv === 'N/A' ? 'N/A' : '$' + agg.costPerConv) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';

      container.innerHTML = html;
    }

    function renderBestMessages() {
      const container = document.getElementById('creative-view-messages');
      const filtered = getFilteredCreatives()
        .filter(c => c.primaryText || c.headline)
        .filter(c => c.impressions >= 100)
        .sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr))
        .slice(0, 20);

      if (filtered.length === 0) {
        container.innerHTML = '<p style="color:#6b7280;text-align:center;padding:40px;">No creatives with sufficient data.</p>';
        return;
      }

      let html = '<p style="color:#6b7280;font-size:13px;margin-bottom:16px;">Top 20 creatives by CTR (min 100 impressions). Click to view details.</p>';
      filtered.forEach((c, i) => {
        const idx = creatives.indexOf(c);
        const cls = classifyCreative(c);
        html += '<div class="message-card" style="cursor:pointer" onclick="openCreativeModal(' + idx + ')">';
        html += '<div class="msg-rank">#' + (i + 1) + '</div>';
        if (c.imageUrl) {
          html += '<img src="' + c.imageUrl + '" style="width:80px;height:60px;border-radius:6px;object-fit:cover;" onerror="this.hidden=true">';
        }
        html += '<div class="msg-body">';
        html += '<div class="msg-headline">' + escapeHtmlJS(c.headline || 'Creative ' + c.id) + '</div>';
        if (c.primaryText) {
          html += '<div class="msg-text">' + escapeHtmlJS(c.primaryText.substring(0, 200)) + '</div>';
        }
        html += '<div class="msg-meta">';
        html += '<span>CTR: <strong>' + c.ctr + '%</strong></span>';
        html += '<span>Eng%: <strong>' + c.engagementRate + '%</strong></span>';
        html += '<span>Clicks: <strong>' + c.clicks.toLocaleString() + '</strong></span>';
        html += '<span>Impr: <strong>' + c.impressions.toLocaleString() + '</strong></span>';
        html += '<span>CPC: <strong>$' + c.cpc + '</strong></span>';
        html += '<span style="color:#9ca3af;">' + cls.product + ' / ' + cls.segment + ' / ' + cls.format + '</span>';
        html += '</div></div></div>';
      });

      container.innerHTML = html;
    }

    function renderBestFormats() {
      const container = document.getElementById('creative-view-formats');
      const filtered = getFilteredCreatives();

      // Group by format
      const byFormat = new Map();
      for (const c of filtered) {
        const cls = classifyCreative(c);
        if (!byFormat.has(cls.format)) byFormat.set(cls.format, []);
        byFormat.get(cls.format).push(c);
      }

      const sortedFormats = Array.from(byFormat.entries()).sort((a, b) => {
        const aImp = a[1].reduce((s, c) => s + c.impressions, 0);
        const bImp = b[1].reduce((s, c) => s + c.impressions, 0);
        return bImp - aImp;
      });

      if (sortedFormats.length === 0) {
        container.innerHTML = '<p style="color:#6b7280;text-align:center;padding:40px;">No creative data available.</p>';
        return;
      }

      // Summary cards
      let html = '<div class="group-summary-grid">';
      for (const [format, items] of sortedFormats) {
        const agg = aggregateGroup(items);
        html += '<div class="group-card">';
        html += '<h3>' + escapeHtmlJS(format) + ' <span style="color:#6b7280;font-weight:400;font-size:12px;">(' + agg.count + ' creatives)</span></h3>';
        html += '<div class="group-metrics">';
        html += '<div class="gm"><div class="val">' + agg.impressions.toLocaleString() + '</div><div class="lbl">Impressions</div></div>';
        html += '<div class="gm"><div class="val">' + agg.ctr + '%</div><div class="lbl">CTR</div></div>';
        html += '<div class="gm"><div class="val">' + agg.engRate + '%</div><div class="lbl">Eng Rate</div></div>';
        html += '<div class="gm"><div class="val">$' + agg.cpm + '</div><div class="lbl">CPM</div></div>';
        html += '<div class="gm"><div class="val">$' + agg.cpc + '</div><div class="lbl">CPC</div></div>';
        html += '<div class="gm"><div class="val">' + agg.conversions + '</div><div class="lbl">Conv</div></div>';
        html += '</div></div>';
      }
      html += '</div>';

      // Top creatives per format
      for (const [format, items] of sortedFormats) {
        const top5 = items.sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr)).slice(0, 5);
        html += '<h3 style="font-size:15px;font-weight:600;margin:20px 0 12px;color:#111827;">Top ' + escapeHtmlJS(format) + ' Creatives (by CTR)</h3>';
        html += '<div class="table-wrapper"><table><thead><tr>';
        html += '<th>Creative</th><th>Campaign</th><th class="number">Impr</th><th class="number">Clicks</th><th class="number">CTR</th><th class="number">Eng%</th><th class="number">Spend</th><th class="number">CPC</th><th class="number">Conv</th>';
        html += '</tr></thead><tbody>';
        for (const c of top5) {
          html += '<tr style="cursor:pointer" onclick="openCreativeModal(' + creatives.indexOf(c) + ')">';
          html += '<td><strong>' + escapeHtmlJS(c.headline || 'Creative ' + c.id) + '</strong></td>';
          html += '<td><span class="creative-campaign">' + escapeHtmlJS(c.campaignName || '-') + '</span></td>';
          html += '<td class="number">' + c.impressions.toLocaleString() + '</td>';
          html += '<td class="number">' + c.clicks.toLocaleString() + '</td>';
          html += '<td class="number">' + c.ctr + '%</td>';
          html += '<td class="number">' + c.engagementRate + '%</td>';
          html += '<td class="number">$' + c.cost + '</td>';
          html += '<td class="number">$' + c.cpc + '</td>';
          html += '<td class="number">' + c.conversions + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table></div>';
      }

      container.innerHTML = html;
    }

    let activeCreativeView = 'all';

    function showCreativeView(viewName, btn) {
      document.querySelectorAll('.creative-sub-tab').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.creative-view').forEach(el => el.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.getElementById('creative-view-' + viewName).classList.add('active');
      activeCreativeView = viewName;

      // Render dynamic views on demand
      if (viewName === 'product') renderGroupedView('creative-view-product', 'product');
      else if (viewName === 'segment') renderGroupedView('creative-view-segment', 'segment');
      else if (viewName === 'format') renderGroupedView('creative-view-format', 'format');
      else if (viewName === 'ratio') renderGroupedView('creative-view-ratio', 'imageRatio');
      else if (viewName === 'messages') renderBestMessages();
      else if (viewName === 'formats') renderBestFormats();
    }

    function refreshCreativeViews() {
      if (activeCreativeView !== 'all') {
        showCreativeView(activeCreativeView, document.querySelector('.creative-sub-tab.active'));
      }
    }

    // ==================== Initialize ====================
    initChart();
    renderConversions(filterState.selectedCampaignIds);
    renderDemographics(filterState.selectedCampaignIds);
  </script>
</body>
</html>`;
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toString();
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

generateDashboard().catch(console.error);
