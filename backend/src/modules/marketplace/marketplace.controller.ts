import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { assertVerifiedUser } from '../../middleware/auth';
import { ForbiddenError } from '../../utils/errors';
import {
  AIMatchDevelopersSchema,
  AIRefineOpportunitySchema,
  ApplyOpportunitySchema,
  CompareCandidatesSchema,
  CreateOpportunitySchema,
  PublishOpportunitySchema,
  SearchDevelopersQuerySchema,
  SearchOpportunitiesQuerySchema,
  UpdateApplicationStatusSchema,
  UpdateOpportunitySchema,
} from './marketplace.schema';
import { marketplaceService } from './marketplace.service';

function assertClientOrAdmin(role: Role): void {
  if (role === Role.FREELANCER) {
    throw new ForbiddenError('This marketplace action requires a Client or Admin account.');
  }
}

function assertDeveloperOrAdmin(role: Role): void {
  if (role === Role.CLIENT) {
    throw new ForbiddenError('This marketplace action requires a Developer account.');
  }
}

export class MarketplaceController {
  async searchDevelopers(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const query = SearchDevelopersQuerySchema.parse(req.query);
      const result = await marketplaceService.searchDevelopers(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async aiMatchDevelopers(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = AIMatchDevelopersSchema.parse(req.body);
      const result = await marketplaceService.aiMatchDevelopers(user.id, body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPublicDeveloperProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      const profile = await marketplaceService.getPublicDeveloperProfile(req.params.profileId, user);
      res.status(200).json({ profile });
    } catch (err) {
      next(err);
    }
  }

  async refineOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = AIRefineOpportunitySchema.parse(req.body);
      const result = await marketplaceService.refineOpportunityWithAi(body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = CreateOpportunitySchema.parse(req.body);
      const opportunity = await marketplaceService.createOpportunity(user.id, body);
      res.status(201).json({ opportunity });
    } catch (err) {
      next(err);
    }
  }

  async updateOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = UpdateOpportunitySchema.parse(req.body);
      const opportunity = await marketplaceService.updateOpportunity(req.params.id, user, body);
      res.status(200).json({ opportunity });
    } catch (err) {
      next(err);
    }
  }

  async publishOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = PublishOpportunitySchema.parse(req.body);
      const opportunity = await marketplaceService.publishOpportunity(
        req.params.id,
        user,
        body.visibility
      );
      res.status(200).json({ opportunity });
    } catch (err) {
      next(err);
    }
  }

  async unpublishOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const opportunity = await marketplaceService.unpublishOpportunity(req.params.id, user);
      res.status(200).json({ opportunity });
    } catch (err) {
      next(err);
    }
  }

  async searchOpportunities(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      const query = SearchOpportunitiesQuerySchema.parse(req.query);
      const result = await marketplaceService.searchOpportunities(user, query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOpportunityById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      const opportunity = await marketplaceService.getOpportunityById(req.params.id, user);
      res.status(200).json({ opportunity });
    } catch (err) {
      next(err);
    }
  }

  async saveOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const result = await marketplaceService.toggleSaveOpportunity(user.id, req.params.id, true);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async unsaveOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const result = await marketplaceService.toggleSaveOpportunity(user.id, req.params.id, false);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async applyToOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const body = ApplyOpportunitySchema.parse(req.body);
      const application = await marketplaceService.applyToOpportunity(user.id, req.params.id, body);
      res.status(201).json({ application });
    } catch (err) {
      next(err);
    }
  }

  async getMyApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const applications = await marketplaceService.getDeveloperApplications(user.id);
      res.status(200).json({ applications });
    } catch (err) {
      next(err);
    }
  }

  async withdrawApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const application = await marketplaceService.withdrawApplication(req.params.id, user.id);
      res.status(200).json({ application });
    } catch (err) {
      next(err);
    }
  }

  async getOpportunityApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const result = await marketplaceService.getOpportunityApplicationsForClient(req.params.id, user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = UpdateApplicationStatusSchema.parse(req.body);
      const application = await marketplaceService.updateApplicationStatus(req.params.id, user, body);
      res.status(200).json({ application });
    } catch (err) {
      next(err);
    }
  }

  async compareCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertClientOrAdmin(user.role);
      const body = CompareCandidatesSchema.parse(req.body);
      const result = await marketplaceService.compareCandidatesForOpportunity(
        req.params.id,
        user,
        body
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const marketplaceController = new MarketplaceController();
