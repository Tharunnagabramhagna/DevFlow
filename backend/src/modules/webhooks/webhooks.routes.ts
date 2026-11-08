import { Router } from 'express';
import { webhooksController } from './webhooks.controller';

export const webhooksRouter = Router();

// PayPal Webhook Ingestion Endpoint: /api/webhooks/paypal
webhooksRouter.post('/paypal', webhooksController.handlePayPalWebhook);

