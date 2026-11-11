import { Router } from 'express';
import { authenticate, requireNonGuest } from '../../middleware/auth';
import { invitationsController } from './invitations.controller';

const router = Router();
router.use(authenticate, requireNonGuest);

// Retrieve all pending invitations for currently authenticated user
router.get(
  '/me',
  authenticate,
  invitationsController.getUserInvitations
);

// Accept invitation
router.post(
  '/:token/accept',
  authenticate,
  invitationsController.acceptInvitation
);

// Decline invitation
router.post(
  '/:token/decline',
  authenticate,
  invitationsController.declineInvitation
);

export const invitationsRouter = router;

