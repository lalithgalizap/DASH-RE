const mongoose = require('mongoose');

// Single-document settings store — always upserted with key = 'global'
const appSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },

  // Snapshot job schedule
  snapshotSchedule: {
    // cron expression, e.g. '0 0 * * 6'
    cronExpression: { type: String, default: '0 0 * * 6' },
    // Human-readable label stored alongside so the UI can display it
    label: { type: String, default: 'Every Friday at 6:00 PM CST' },
    // Whether the job is enabled
    enabled: { type: Boolean, default: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);
