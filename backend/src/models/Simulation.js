const mongoose = require('mongoose');

const percentilesSchema = new mongoose.Schema(
  {
    p50: { type: Number, default: 0 },
    p95: { type: Number, default: 0 },
    p99: { type: Number, default: 0 },
  },
  { _id: false }
);

const metricsSchema = new mongoose.Schema(
  {
    totalRequests: { type: Number, default: 0 },
    completedRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    avgLatency: { type: Number, default: 0 },
    percentiles: { type: percentilesSchema, default: () => ({}) },
    throughput: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    timeSeriesData: { type: [mongoose.Schema.Types.Mixed], default: [] },
    nodeMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const configSchema = new mongoose.Schema(
  {
    trafficRate: { type: Number, default: 10 },
    failureInjection: { type: Number, default: 0 },
    trafficPattern: {
      type: String,
      enum: ['constant', 'ramp', 'spike', 'random'],
      default: 'constant',
    },
  },
  { _id: false }
);

const requestLogEntrySchema = new mongoose.Schema(
  {
    requestId: { type: String },
    timestamp: { type: Number },
    path: { type: [String] },
    latency: { type: Number },
    status: { type: String },
    failedAt: { type: String },
  },
  { _id: false }
);

const simulationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: 'Untitled Simulation',
    },
    config: {
      type: configSchema,
      default: () => ({}),
    },
    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },
    requestLog: {
      type: [requestLogEntrySchema],
      validate: {
        validator: function (arr) {
          return arr.length <= 500;
        },
        message: 'Request log cannot exceed 500 entries',
      },
      default: [],
    },
    duration: {
      type: Number,
      default: 0,
      comment: 'Duration in milliseconds',
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'completed',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

simulationSchema.index({ projectId: 1, createdAt: -1 });
simulationSchema.index({ userId: 1, createdAt: -1 });

// toJSON: normalize id
simulationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Simulation = mongoose.model('Simulation', simulationSchema);

module.exports = Simulation;
