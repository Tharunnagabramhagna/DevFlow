import { Request, Response, NextFunction } from 'express';
import { webhooksService } from './webhooks.service';

export class WebhooksController {
  async handlePayPalWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await webhooksService.handlePayPalWebhook(req.headers, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const webhooksController = new WebhooksController();

