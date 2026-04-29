const mongoose = require('mongoose');

const performanceReportSchema = new mongoose.Schema({
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quarter: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  period_start: {
    type: Date
  },
  period_end: {
    type: Date
  },
  overall_status: {
    type: String,
    enum: ['red', 'amber', 'green', null],
    default: null
  },
  overall_reasons: {
    type: String,
    default: ''
  },
  // Scorecard fields matching Manager Feedback Form
  delivery: {
    type: String,
    enum: ['yes', 'mostly', 'not', null],
    default: null
  },
  delivery_comments: {
    type: String,
    default: ''
  },
  quality: {
    type: String,
    enum: ['good', 'mixed', 'poor', null],
    default: null
  },
  quality_comments: {
    type: String,
    default: ''
  },
  rework: {
    type: String,
    enum: ['high', 'medium', 'low', null],
    default: null
  },
  rework_comments: {
    type: String,
    default: ''
  },
  communication: {
    type: String,
    enum: ['effective', 'needs_improvement', null],
    default: null
  },
  communication_comments: {
    type: String,
    default: ''
  },
  strengths: {
    type: String,
    default: ''
  },
  areas_of_improvement: {
    type: String,
    default: ''
  },
  support_needed: {
    type: String,
    default: ''
  },
  recommendation: {
    type: String,
    enum: ['continue_strong', 'continue_meets', 'continue_improvement', 'replacement', 'role_change', null],
    default: null
  },
  // OCR extracted metadata (header fields from PDF)
  resource_name: {
    type: String,
    default: ''
  },
  resource_id_string: {
    type: String,
    default: ''
  },
  role_team: {
    type: String,
    default: ''
  },
  manager_name: {
    type: String,
    default: ''
  },
  prepared_by: {
    type: String,
    default: ''
  },
  prepared_on: {
    type: String,
    default: ''
  },
  // OCR audit trail
  extracted_raw_text: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed'],
    default: 'draft'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PerformanceReport', performanceReportSchema);
