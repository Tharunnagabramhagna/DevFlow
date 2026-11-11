import { Request, Response, NextFunction } from 'express';
import { assertVerifiedUser } from '../../middleware/auth';
import { paymentsService } from './payments.service';

export class PaymentsController {
  async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const payment = await paymentsService.createInvoice(user.id, req.body, user.role);
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const payment = await paymentsService.cancelInvoice(
        user.id,
        req.params.id,
        req.body?.reason,
        user.role
      );
      res.status(200).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const result = await paymentsService.createRefund(
        user.id,
        user.role,
        req.params.id,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const payment = await paymentsService.getPaymentById(
        user.id,
        user.role,
        req.params.id
      );
      res.status(200).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async getProjectPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const projectId = req.params.projectId || (req.query.projectId as string | undefined);
      const result = await paymentsService.getProjectPayments(
        user.id,
        user.role,
        projectId,
        req.query as any
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const paymentsController = new PaymentsController();

