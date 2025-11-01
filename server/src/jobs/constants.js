module.exports = {
  QUEUES: {
    RISK: 'risk-monitoring',
    PAYOUT: 'payout-processing'
  },
  JOBS: {
    RISK_VELOCITY: 'risk:velocity-scan',
    RISK_DAILY_CAP: 'risk:daily-cap-scan',
    RISK_FULL_SWEEP: 'risk:full-sweep',
    PAYOUT_DAILY_BATCH: 'payout:daily-batch',
    PAYOUT_PROCESS_WITHDRAWAL: 'payout:process-withdrawal',
    PAYOUT_URGENT_REVIEW: 'payout:urgent-review'
  }
};
