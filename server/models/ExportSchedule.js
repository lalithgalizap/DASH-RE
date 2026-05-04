const mongoose = require('mongoose');

const exportScheduleSchema = new mongoose.Schema({
  scheduleDay: {
    type: String,
    required: true,
    enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    default: 'friday'
  },
  scheduleTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    default: '18:00'
  },
  recipients: [{
    type: String,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Basic email validation
  }],
  format: {
    type: String,
    required: true,
    enum: ['csv', 'excel'],
    default: 'csv'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSent: {
    type: Date,
    default: null
  },
  lastSentStatus: {
    type: String,
    enum: ['success', 'failed', null],
    default: null
  },
  lastSentError: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timezone: {
    type: String,
    default: 'America/Chicago' // CST
  }
}, {
  timestamps: true
});

// Only one active schedule allowed
exportScheduleSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('ExportSchedule', exportScheduleSchema);
