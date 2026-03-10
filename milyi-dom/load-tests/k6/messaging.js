/**
 * k6 load test — Messaging endpoints
 *
 * Targets:
 *   GET  /api/messages               (conversation list)
 *   GET  /api/messages/:id/history   (message history)
 *
 * Requires env vars:
 *   BASE_URL         — API base (default: https://api.milyidom.com)
 *   USER_TOKEN       — valid JWT for any authenticated user
 *   CONVERSATION_ID  — an existing conversation ID
 *
 * Run:
 *   k6 run --env BASE_URL=https://api.milyidom.com \
 *          --env USER_TOKEN=<token> \
 *          --env CONVERSATION_ID=<id> \
 *          messaging.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL         = __ENV.BASE_URL         || 'https://api.milyidom.com';
const TOKEN            = __ENV.USER_TOKEN        || '';
const CONVERSATION_ID  = __ENV.CONVERSATION_ID   || '';

const listLatency    = new Trend('messages_list_duration', true);
const historyLatency = new Trend('messages_history_duration', true);
const errorRate      = new Rate('messaging_errors');

export const options = {
  stages: [
    { duration: '20s', target: 15 },
    { duration: '1m',  target: 15 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    messages_list_duration:    ['p(95)<200'],
    messages_history_duration: ['p(95)<200'],
    messaging_errors:          ['rate<0.01'],
    http_req_failed:           ['rate<0.01'],
  },
};

const headers = {
  Accept: 'application/json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

export default function () {
  // 1. Conversation list
  const listRes = http.get(`${BASE_URL}/api/messages`, {
    headers,
    tags: { name: 'messages_list' },
  });

  const listOk = check(listRes, {
    'conversations 200': (r) => r.status === 200,
  });
  listLatency.add(listRes.timings.duration);
  errorRate.add(!listOk);

  sleep(0.5);

  // 2. History for a known conversation
  if (CONVERSATION_ID) {
    const histRes = http.get(`${BASE_URL}/api/messages/${CONVERSATION_ID}/history`, {
      headers,
      tags: { name: 'messages_history' },
    });

    const histOk = check(histRes, {
      'history 200': (r) => r.status === 200,
    });
    historyLatency.add(histRes.timings.duration);
    errorRate.add(!histOk);
  }

  sleep(1);
}
