import { Router } from 'express';
import { authenticate, requireNonGuest } from '../../middleware/auth';
import { marketplaceController } from './marketplace.controller';

export const marketplaceRouter = Router();
marketplaceRouter.use(authenticate, requireNonGuest);

// Client Developer Discovery & AI Talent Matching
marketplaceRouter.get('/developers', marketplaceController.searchDevelopers);
marketplaceRouter.post('/developers/match', marketplaceController.aiMatchDevelopers);
marketplaceRouter.get('/developers/:profileId', marketplaceController.getPublicDeveloperProfile);

// Client Opportunity Lifecycle & AI Scope Refinement
marketplaceRouter.post('/opportunities/ai-refine', marketplaceController.refineOpportunity);
marketplaceRouter.post('/opportunities', marketplaceController.createOpportunity);
marketplaceRouter.patch('/opportunities/:id', marketplaceController.updateOpportunity);
marketplaceRouter.post('/opportunities/:id/publish', marketplaceController.publishOpportunity);
marketplaceRouter.post('/opportunities/:id/unpublish', marketplaceController.unpublishOpportunity);
marketplaceRouter.get('/opportunities/:id/applications', marketplaceController.getOpportunityApplications);
marketplaceRouter.post('/opportunities/:id/compare', marketplaceController.compareCandidates);

// Opportunity Discovery, Save & Apply
marketplaceRouter.get('/opportunities', marketplaceController.searchOpportunities);
marketplaceRouter.get('/opportunities/:id', marketplaceController.getOpportunityById);
marketplaceRouter.post('/opportunities/:id/save', marketplaceController.saveOpportunity);
marketplaceRouter.delete('/opportunities/:id/save', marketplaceController.unsaveOpportunity);
marketplaceRouter.post('/opportunities/:id/apply', marketplaceController.applyToOpportunity);

// Applications Management
marketplaceRouter.get('/applications/mine', marketplaceController.getMyApplications);
marketplaceRouter.post('/applications/:id/withdraw', marketplaceController.withdrawApplication);
marketplaceRouter.patch('/applications/:id/status', marketplaceController.updateApplicationStatus);
