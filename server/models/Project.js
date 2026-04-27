const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  project_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  priority: String,
  stage: String,
  status: {
    type: String,
    default: 'Active'
  },
  summary: String,
  clients: String,
  links: String,
  owner: String,
  vertical: String,
  region: String,
  sponsor: String,
  anchor_customer: String,
  spoc: String,
  actionItem: String,
  riskSummary: String,
  mitigationPlan: String,
  sowStatus: String,
  dashboardUpdatedAt: Date,
  created_at: Date,
  updated_at: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
