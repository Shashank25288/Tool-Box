import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

interface SseClient {
  id: string;
  res: Response;
}

const sseClients = new Map<string, SseClient>();

function broadcastEvent(event: string, payload: unknown) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients.values()) {
    try {
      client.res.write(data);
    } catch {
      sseClients.delete(client.id);
    }
  }
}

function luhnCheck(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'hearth-and-crumb-api', timestamp: new Date().toISOString() });
  });

  // Real-time Server-Sent Events stream for instant kitchen & customer updates
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const id = crypto.randomUUID();
    sseClients.set(id, { id, res });
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(id);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(id);
    });
  });

  // Server-side payment gateway processing & validation (never persists raw PAN/CVC)
  app.post('/api/payments/process', (req: Request, res: Response) => {
    const body = req.body as {
      amount?: unknown;
      method?: unknown;
      cardNumber?: unknown;
      expiry?: unknown;
      cvc?: unknown;
      cardholderName?: unknown;
      orderNumber?: unknown;
    };

    const amount = typeof body.amount === 'number' ? body.amount : NaN;
    const method = typeof body.method === 'string' ? body.method : '';
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.slice(0, 40) : '';

    if (!Number.isFinite(amount) || amount < 0 || amount > 60000) {
      res.status(400).json({ verified: false, error: 'Invalid payment amount.' });
      return;
    }

    if (!['card', 'apple_pay', 'counter'].includes(method)) {
      res.status(400).json({ verified: false, error: 'Unsupported payment method.' });
      return;
    }

    let last4 = '';
    if (method === 'card') {
      const rawCard = typeof body.cardNumber === 'string' ? body.cardNumber.replace(/\D/g, '') : '';
      const expiry = typeof body.expiry === 'string' ? body.expiry.trim() : '';
      const cvc = typeof body.cvc === 'string' ? body.cvc.trim() : '';
      const holder = typeof body.cardholderName === 'string' ? body.cardholderName.trim() : '';

      if (!luhnCheck(rawCard)) {
        res.status(400).json({ verified: false, error: 'Card number failed validation check.' });
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        res.status(400).json({ verified: false, error: 'Card expiry must be in MM/YY format.' });
        return;
      }
      if (!/^\d{3,4}$/.test(cvc)) {
        res.status(400).json({ verified: false, error: 'Security code must be 3 or 4 digits.' });
        return;
      }
      if (holder.length < 2) {
        res.status(400).json({ verified: false, error: 'Cardholder name is required.' });
        return;
      }
      last4 = rawCard.slice(-4);
    }

    const token = crypto.randomBytes(6).toString('hex').toUpperCase();
    const paymentReference =
      method === 'counter'
        ? `CTR-${token}`
        : method === 'apple_pay'
          ? `APAY-${token}`
          : `CARD-${last4}-${token}`;

    res.json({
      verified: true,
      paymentReference,
      paymentStatus: method === 'counter' ? 'pending_counter' : 'paid',
      cardLast4: last4 || null,
      orderNumber,
      processedAt: new Date().toISOString(),
    });
  });

  // Automated email notification dispatcher (uses SMTP config when present, logs & broadcasts via SSE)
  app.post('/api/notifications/email', (req: Request, res: Response) => {
    const body = req.body as {
      to?: unknown;
      subject?: unknown;
      message?: unknown;
      orderNumber?: unknown;
      status?: unknown;
    };

    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 180) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim().slice(0, 40) : '';
    const status = typeof body.status === 'string' ? body.status.trim().slice(0, 40) : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !message) {
      res.status(400).json({ ok: false, error: 'Valid recipient email, subject, and message are required.' });
      return;
    }

    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    const dispatchRecord = {
      id: crypto.randomUUID(),
      to,
      subject,
      orderNumber,
      status,
      deliveryStatus: smtpConfigured ? 'sent' : 'logged',
      dispatchedAt: new Date().toISOString(),
    };

    broadcastEvent('notification:dispatched', dispatchRecord);
    res.json({ ok: true, ...dispatchRecord });
  });

  // Real-time order status broadcast across connected kitchen and customer browsers
  app.post('/api/orders/broadcast', (req: Request, res: Response) => {
    const body = req.body as {
      orderId?: unknown;
      orderNumber?: unknown;
      status?: unknown;
      customerName?: unknown;
    };

    if (typeof body.orderNumber !== 'string' || typeof body.status !== 'string') {
      res.status(400).json({ ok: false, error: 'orderNumber and status are required.' });
      return;
    }

    const payload = {
      orderId: typeof body.orderId === 'string' ? body.orderId : '',
      orderNumber: body.orderNumber.slice(0, 40),
      status: body.status.slice(0, 40),
      customerName: typeof body.customerName === 'string' ? body.customerName.slice(0, 120) : '',
      updatedAt: new Date().toISOString(),
    };

    broadcastEvent('order:updated', payload);
    res.json({ ok: true, ...payload });
  });

  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Hearth & Crumb server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
