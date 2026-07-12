import express, { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller';
import { authenticate } from '../middleware/authenticate';

// SSLCommerz posts these as application/x-www-form-urlencoded, not JSON —
// the app-wide express.json() (app.ts) doesn't parse that, so this router
// gets its own urlencoded parser rather than changing the global one.
const router = Router();
router.use(express.urlencoded({ extended: true }));

// Public — no authenticate/authorize. SSLCommerz calls ipn server-to-server
// (its own IP, not a logged-in user); success/fail/cancel are browser
// redirects from SSLCommerz's hosted page, also never carrying our own
// session. Trust boundary is handled entirely inside
// ResourcePurchaseService.handleIpn (independent val_id validation), not
// here.
router.post('/sslcommerz/ipn', paymentsController.ipn);
router.post('/sslcommerz/success', paymentsController.success);
router.post('/sslcommerz/fail', paymentsController.fail);
router.post('/sslcommerz/cancel', paymentsController.cancel);
// SSLCommerz's redirect is a POST in practice, but GET fallbacks cost
// nothing and guard against a browser resubmitting as GET (back button,
// bookmarked link, etc.).
router.get('/sslcommerz/success', paymentsController.success);
router.get('/sslcommerz/fail', paymentsController.fail);
router.get('/sslcommerz/cancel', paymentsController.cancel);

router.get('/purchases/:id', authenticate, paymentsController.getPurchaseStatus);

export default router;
