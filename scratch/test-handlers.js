const path = require('path');
const fs = require('fs');

// Helper to mock req/res
function mockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body || {},
    params: options.params || {},
    url: options.url || '/'
  };

  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    send(data) {
      this.data = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    }
  };

  return { req, res };
}

async function runTests() {
  console.log('🧪 Running Direct Unit Tests on API Handlers & Route Resolution...\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  }

  // 1. Test Dev-Server Path Resolution Logic for /api/reviews
  await test('Dev-server path resolution for /api/reviews resolves to api/reviews/index.js', () => {
    const testPath = '/api/reviews';
    const apiPath = testPath.replace(/^\/api\/?/, '');
    const parts = apiPath.split('/');
    const directPath = path.join(__dirname, '..', 'api', ...parts) + '.js';
    const indexPath = path.join(__dirname, '..', 'api', apiPath, 'index.js');
    
    let resolved = null;
    if (fs.existsSync(directPath)) resolved = directPath;
    else if (fs.existsSync(indexPath)) resolved = indexPath;

    if (!resolved || !resolved.endsWith('api/reviews/index.js')) {
      throw new Error(`Failed to resolve /api/reviews! Resolved to: ${resolved}`);
    }
  });

  // 2. Test Dev-Server Path Resolution Logic for /api/orders/123
  await test('Dev-server dynamic path resolution for /api/orders/123 resolves to api/orders/[id].js', () => {
    const testPath = '/api/orders/123';
    const apiPath = testPath.replace(/^\/api\/?/, '');
    const parts = apiPath.split('/');
    let resolved = null;
    if (parts.length >= 2) {
      const dynamicPath = path.join(__dirname, '..', 'api', parts[0], '[id].js');
      if (fs.existsSync(dynamicPath)) {
        resolved = dynamicPath;
      }
    }

    if (!resolved || !resolved.endsWith('api/orders/[id].js')) {
      throw new Error(`Failed to resolve /api/orders/123! Resolved to: ${resolved}`);
    }
  });

  // 3. Test Security: PUT /api/products/[id] without admin token
  await test('api/products/[id].js PUT rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/products/[id]');
    const { req, res } = mockReqRes({ method: 'PUT', query: { id: '1' }, body: { name: 'Hacked' } });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  // 4. Test Security: DELETE /api/products/[id] without admin token
  await test('api/products/[id].js DELETE rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/products/[id]');
    const { req, res } = mockReqRes({ method: 'DELETE', query: { id: '1' } });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  // 5. Test Security: POST /api/products without admin token
  await test('api/products/index.js POST rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/products/index');
    const { req, res } = mockReqRes({ method: 'POST', body: { name: 'Hacked' } });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  // 6. Test Security: POST /api/categories without admin token
  await test('api/categories/index.js POST rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/categories/index');
    const { req, res } = mockReqRes({ method: 'POST', body: { name: 'Hacked' } });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  // 7. Test Security: GET /api/query-logs without superadmin token
  await test('api/query-logs/index.js GET rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/query-logs/index');
    const { req, res } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  // 8. Test Security: GET /api/orders/[id] without token
  await test('api/orders/[id].js GET rejects unauthenticated caller with 401', async () => {
    const handler = require('../api/orders/[id]');
    const { req, res } = mockReqRes({ method: 'GET', query: { id: '1' } });
    await handler(req, res);
    if (res.statusCode !== 401) {
      throw new Error(`Expected 401, got ${res.statusCode}`);
    }
  });

  // 9. Test emailService export has sendOrderConfirmationEmail
  await test('lib/emailService.js exports sendOrderConfirmationEmail function', () => {
    const emailService = require('../lib/emailService');
    if (typeof emailService.sendOrderConfirmationEmail !== 'function') {
      throw new Error(`sendOrderConfirmationEmail is not a function in emailService`);
    }
  });

  // 10. Test Security: GET /api/admin/search-image without admin token
  await test('api/admin/search-image.js GET rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/admin/search-image');
    const { req, res } = mockReqRes({ method: 'GET', query: { query: 'test' } });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  // 11. Test Security: POST /api/admin/search-image without admin token
  await test('api/admin/search-image.js POST rejects unauthenticated caller with 403', async () => {
    const handler = require('../api/admin/search-image');
    const { req, res } = mockReqRes({ method: 'POST', body: { image_urls: ['http://example.com/1.jpg'] } });
    await handler(req, res);
    if (res.statusCode !== 403) {
      throw new Error(`Expected 403, got ${res.statusCode}`);
    }
  });

  console.log(`\n🏁 Test Results: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
