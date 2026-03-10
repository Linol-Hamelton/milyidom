import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ── Counters ────────────────────────────────────────────────────────────────
  readonly bookingsCreated = new Counter({
    name: 'milyi_dom_bookings_created_total',
    help: 'Total number of bookings created',
    labelNames: ['status'] as const, // 'instant' | 'pending'
    registers: [this.registry],
  });

  readonly paymentsProcessed = new Counter({
    name: 'milyi_dom_payments_processed_total',
    help: 'Total number of payments processed',
    labelNames: ['status'] as const, // 'paid' | 'failed' | 'refunded'
    registers: [this.registry],
  });

  readonly authAttempts = new Counter({
    name: 'milyi_dom_auth_attempts_total',
    help: 'Authentication attempts',
    labelNames: ['type', 'result'] as const, // type: login|register; result: success|fail
    registers: [this.registry],
  });

  readonly emailsSent = new Counter({
    name: 'milyi_dom_emails_sent_total',
    help: 'Emails sent via queue',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });

  readonly payoutsScheduled = new Counter({
    name: 'milyi_dom_payouts_scheduled_total',
    help: 'Host payouts scheduled',
    registers: [this.registry],
  });

  readonly aiRequests = new Counter({
    name: 'milyi_dom_ai_requests_total',
    help: 'AI API calls',
    labelNames: ['type', 'result'] as const, // type: search|fraud|pricing|translate; result: ok|error
    registers: [this.registry],
  });

  readonly fraudFlagged = new Counter({
    name: 'milyi_dom_fraud_flagged_total',
    help: 'Listings flagged as fraud by detection system',
    labelNames: ['method'] as const, // 'regex' | 'ai'
    registers: [this.registry],
  });

  // ── Gauges ──────────────────────────────────────────────────────────────────
  readonly activeWebSocketConnections = new Gauge({
    name: 'milyi_dom_websocket_connections',
    help: 'Current active WebSocket connections',
    registers: [this.registry],
  });

  readonly bullQueueDepth = new Gauge({
    name: 'milyi_dom_bull_queue_depth',
    help: 'Number of waiting jobs in Bull queues',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  // ── Histograms ──────────────────────────────────────────────────────────────
  readonly httpRequestDuration = new Histogram({
    name: 'milyi_dom_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'milyi_dom_process_',
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
