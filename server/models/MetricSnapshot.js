const mongoose = require('mongoose');

const metricSnapshotSchema = new mongoose.Schema({
  weekEnding: {
    type: Date,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  weekNumber: {
    type: Number,
    required: true
  },
  metrics: {
    overdueMilestonesTotal: {
      type: Number,
      default: 0
    },
    upcomingMilestonesTotal: {
      type: Number,
      default: 0
    },
    openCriticalRisksTotal: {
      type: Number,
      default: 0
    },
    openCriticalIssuesTotal: {
      type: Number,
      default: 0
    },
    openEscalationsTotal: {
      type: Number,
      default: 0
    },
    openDependenciesTotal: {
      type: Number,
      default: 0
    }
  },
  projectCount: {
    type: Number,
    default: 0
  },
  activeProjectCount: {
    type: Number,
    default: 0
  },
  // Per-project breakdown for detailed history view
  projectMetrics: [{
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectName: {
      type: String,
      required: true
    },
    client: {
      type: String,
      default: ''
    },
    overdueMilestones: {
      type: Number,
      default: 0
    },
    upcomingMilestones: {
      type: Number,
      default: 0
    },
    openCriticalRisks: {
      type: Number,
      default: 0
    },
    openCriticalIssues: {
      type: Number,
      default: 0
    },
    openEscalations: {
      type: Number,
      default: 0
    },
    openDependencies: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Compound index to prevent duplicate snapshots for the same week
metricSnapshotSchema.index({ weekEnding: 1 }, { unique: true });

module.exports = mongoose.model('MetricSnapshot', metricSnapshotSchema);
