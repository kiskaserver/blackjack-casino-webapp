const db = require('../config/database');
const playerRepository = require('../repositories/playerRepository');
const verificationRepository = require('../repositories/playerVerificationRepository');

const VERIFICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RESUBMIT: 'resubmit'
};

const PLAYER_VERIFICATION_STATES = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  REVIEW: 'review'
};

const submitVerification = async payload => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const player = await playerRepository.getPlayerById(payload.playerId, client);
    if (!player) {
      throw new Error('Player not found');
    }

    const existingPending = await verificationRepository.findPendingForPlayer(payload.playerId, client);
    if (existingPending) {
      throw new Error('Pending verification already exists');
    }

    const verification = await verificationRepository.createVerificationRequest(payload, client);

    await playerRepository.updateVerificationStatus(
      {
        playerId: payload.playerId,
        verificationStatus: PLAYER_VERIFICATION_STATES.PENDING
      },
      client
    );

    await client.query('COMMIT');
    return verificationRepository.getById(verification.id, client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listVerifications = async options => verificationRepository.listVerifications(options);

const getVerificationById = async id => verificationRepository.getById(id);

const getLatestVerificationForPlayer = async playerId => verificationRepository.getLatestForPlayer(playerId);

const approveVerification = async ({ id, reviewer, note }) => {
  return updateVerificationStatus({
    id,
    status: VERIFICATION_STATUSES.APPROVED,
    reviewer,
    note,
    rejectionReason: null,
    playerStatus: PLAYER_VERIFICATION_STATES.VERIFIED
  });
};

const rejectVerification = async ({ id, reviewer, note, reason }) => {
  return updateVerificationStatus({
    id,
    status: VERIFICATION_STATUSES.REJECTED,
    reviewer,
    note,
    rejectionReason: reason,
    playerStatus: PLAYER_VERIFICATION_STATES.REJECTED
  });
};

const requestResubmission = async ({ id, reviewer, note, reason }) => {
  return updateVerificationStatus({
    id,
    status: VERIFICATION_STATUSES.RESUBMIT,
    reviewer,
    note,
    rejectionReason: reason,
    playerStatus: PLAYER_VERIFICATION_STATES.REVIEW
  });
};

const updateVerificationStatus = async ({ id, status, reviewer, note, rejectionReason, playerStatus }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const verification = await verificationRepository.updateStatus(
      {
        id,
        status,
        reviewedBy: reviewer,
        note,
        rejectionReason
      },
      client
    );

    if (!verification) {
      throw new Error('Verification request not found');
    }

    await playerRepository.updateVerificationStatus(
      {
        playerId: verification.player_id,
        verificationStatus: playerStatus
      },
      client
    );

    await client.query('COMMIT');
    return verificationRepository.getById(id, client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  VERIFICATION_STATUSES,
  PLAYER_VERIFICATION_STATES,
  submitVerification,
  listVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
  requestResubmission,
  getLatestVerificationForPlayer
};
