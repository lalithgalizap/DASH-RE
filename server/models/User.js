const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  in_org: {
    type: Boolean,
    default: true   // true = In Org, false = Out Of Org
  },
  current_quarters: {
    type: [String],
    default: []
  },
  current_year: {
    type: Number,
    default: null
  },
  quarter_activity: {
    type: [{
      year:    { type: Number, required: true },
      quarter: { type: String, enum: ['Q1','Q2','Q3','Q4'], required: true },
      status:  { type: String, enum: ['active','inactive'], default: 'active' }
    }],
    default: []
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
