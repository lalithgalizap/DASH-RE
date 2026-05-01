const mongoose = require('mongoose');

const weeklyUpdateSchema = new mongoose.Schema({
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  week_starting: {
    type: Date,
    required: true
  },
  accomplishments: {
    type: String,
    default: ''
  },
  challenges: {
    type: String,
    default: ''
  },
  next_week_plans: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'submitted'],
    default: 'draft'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for faster queries
weeklyUpdateSchema.index({ resource_id: 1, week_starting: -1 });
weeklyUpdateSchema.index({ manager_id: 1 });

module.exports = mongoose.model('WeeklyUpdate', weeklyUpdateSchema);
