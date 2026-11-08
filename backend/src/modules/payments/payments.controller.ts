import { Request, Response, NextFunction } from 'express';
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
      const result = await paymentsService.createRefund(
        req.user!.id,
        req.user!.role,
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
      const payment = await paymentsService.getPaymentById(
        req.user!.id,
        req.user!.role,
        req.params.id
      );
      res.status(200).json(payment);
    } catch (err) {
      next(err);
    }
  }

  async getProjectPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId || (req.query.projectId as string);
      const result = await paymentsService.getProjectPayments(
        req.user!.id,
        req.user!.role,
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

