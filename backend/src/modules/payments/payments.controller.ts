import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedRole } from '../../middleware/auth';
import { paymentsService } from './payments.service';

export class PaymentsController {
  async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentsService.createInvoice(req.user!.id, req.body);
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentsService.cancelInvoice(
        req.user!.id,
        req.params.id,
        req.body?.reason
      );
      res.status(200).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = getAuthenticatedRole(req.user);
      const result = await paymentsService.createRefund(
        req.user!.id,
        role,
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
      const role = getAuthenticatedRole(req.user);
      const payment = await paymentsService.getPaymentById(
        req.user!.id,
        role,
        req.params.id
      );
      res.status(200).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async getProjectPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = getAuthenticatedRole(req.user);
      const projectId = req.params.projectId || (req.query.projectId as string);
      const result = await paymentsService.getProjectPayments(
        req.user!.id,
        role,
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

