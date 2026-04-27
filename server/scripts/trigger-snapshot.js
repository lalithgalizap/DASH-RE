/**
 * Script to manually trigger a metric snapshot
 * Run with: node server/scripts/trigger-snapshot.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { triggerManualSnapshot } = require('../jobs/metricSnapshotJob');

async function run() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo-dashboard';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Trigger snapshot
    console.log('\n[Trigger] Creating manual snapshot...\n');
    const snapshot = await triggerManualSnapshot();

    console.log('\n[Trigger] Snapshot created successfully!');
    console.log('Week ending:', snapshot.weekEnding.toISOString().split('T')[0]);
    console.log('Metrics:', JSON.stringify(snapshot.metrics, null, 2));
    console.log('Active Projects:', snapshot.activeProjectCount);
    console.log('Total Projects:', snapshot.projectCount);
    console.log('Project breakdown count:', snapshot.projectMetrics?.length || 0);

  } catch (err) {
    console.error('[Trigger] Failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

run();
