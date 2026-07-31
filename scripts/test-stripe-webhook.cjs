/**
 * Stripe Webhook 模拟测试
 *
 * 模拟 Stripe 发送 webhook 事件到本地 webhook 端点
 * 验证完整的 支付 → Webhook → 数据库 流程
 *
 * 用法:
 *   1. 先启动 dev server: pnpm dev
 *   2. 运行测试: node scripts/test-stripe-webhook.cjs
 *
 * 或直接用 Stripe CLI 转发:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *   stripe trigger checkout.session.completed
 */

const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============ 颜色 ============
const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m',
};
const PASS = `${colors.green}✓ PASS${colors.reset}`;
const FAIL = `${colors.red}✗ FAIL${colors.reset}`;
const INFO = `${colors.blue}ℹ INFO${colors.reset}`;
const WARN = `${colors.yellow}⚠ WARN${colors.reset}`;

// ============ 加载 .env ============
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    let val = trimmed.substring(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.includes('`n')) val = val.split('`n')[0];
    if (!process.env[key]) process.env[key] = val;
  }
}

// ============ Stripe Webhook 签名 ============
function signWebhook(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// ============ 发送 HTTP 请求 ============
function sendWebhook(url, payload, signature) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature,
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ============ 主测试 ============
async function main() {
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Stripe Webhook 模拟测试               ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

  loadEnv();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/stripe`;

  if (!webhookSecret) {
    console.log(`${FAIL} STRIPE_WEBHOOK_SECRET 未配置`);
    process.exit(1);
  }

  console.log(`${INFO} Webhook URL: ${webhookUrl}`);
  console.log(`${INFO} Webhook Secret: whsec_...${webhookSecret.slice(-8)}\n`);

  // 检查 dev server 是否在运行
  try {
    const healthResp = await new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}/api/health`, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
    console.log(`${PASS} Dev server 运行中 (HTTP ${healthResp.status})\n`);
  } catch (error) {
    console.log(`${FAIL} Dev server 未运行: ${error.message}`);
    console.log(`${INFO} 请先运行: pnpm dev`);
    console.log(`${INFO} 或使用 Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe`);
    process.exit(1);
  }

  // 测试 1: checkout.session.completed 事件
  console.log(`${colors.cyan}━━━ 测试 1: checkout.session.completed ━━━${colors.reset}`);
  const checkoutEvent = {
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        mode: 'subscription',
        customer: 'cus_test_' + Date.now(),
        customer_email: 'test@bookbunny.com',
        subscription: 'sub_test_' + Date.now(),
        amount_total: 990,
        currency: 'usd',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          userId: 'test-user-id',
          planId: 'pro',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
        },
      },
    },
  };

  const payload1 = JSON.stringify(checkoutEvent);
  const sig1 = signWebhook(payload1, webhookSecret);

  try {
    const resp = await sendWebhook(webhookUrl, checkoutEvent, sig1);
    if (resp.status === 200) {
      console.log(`${PASS} checkout.session.completed 处理成功`);
    } else {
      console.log(`${FAIL} checkout.session.completed 处理失败: HTTP ${resp.status}`);
      console.log(`${colors.gray}    ${resp.body.substring(0, 200)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${FAIL} 请求失败: ${error.message}`);
  }

  // 测试 2: customer.subscription.updated 事件
  console.log(`\n${colors.cyan}━━━ 测试 2: customer.subscription.updated ━━━${colors.reset}`);
  const subEvent = {
    id: 'evt_test_sub_' + Date.now(),
    object: 'event',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_' + Date.now(),
        object: 'subscription',
        customer: 'cus_test_' + Date.now(),
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        cancel_at_period_end: false,
      },
    },
  };

  const payload2 = JSON.stringify(subEvent);
  const sig2 = signWebhook(payload2, webhookSecret);

  try {
    const resp = await sendWebhook(webhookUrl, subEvent, sig2);
    if (resp.status === 200) {
      console.log(`${PASS} customer.subscription.updated 处理成功`);
    } else {
      console.log(`${FAIL} customer.subscription.updated 处理失败: HTTP ${resp.status}`);
      console.log(`${colors.gray}    ${resp.body.substring(0, 200)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${FAIL} 请求失败: ${error.message}`);
  }

  // 测试 3: 签名验证测试（发送错误签名）
  console.log(`\n${colors.cyan}━━━ 测试 3: 签名验证（错误签名应被拒绝）━━━${colors.reset}`);
  try {
    const resp = await sendWebhook(webhookUrl, checkoutEvent, 't=123,v1=invalid_signature');
    if (resp.status === 400) {
      console.log(`${PASS} 错误签名被正确拒绝 (HTTP 400)`);
    } else {
      console.log(`${WARN} 错误签名未被拒绝: HTTP ${resp.status}`);
    }
  } catch (error) {
    console.log(`${FAIL} 请求失败: ${error.message}`);
  }

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${INFO} Webhook 测试完成`);
  console.log(`${INFO} 提示: 完整测试请使用 Stripe CLI 触发真实事件:`);
  console.log(`${colors.gray}    stripe listen --forward-to localhost:3000/api/webhooks/stripe${colors.reset}`);
  console.log(`${colors.gray}    stripe trigger checkout.session.completed${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

main().catch((err) => {
  console.error(`${FAIL} 未捕获错误:`, err);
  process.exit(1);
});
