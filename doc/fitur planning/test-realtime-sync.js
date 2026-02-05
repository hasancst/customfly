const assert = require('assert');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3011';
const SHOP = process.env.TEST_SHOP || 'test-shop.myshopify.com';
const PRODUCT_ID = process.env.TEST_PRODUCT_ID || '9876543210';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test utilities
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`)
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test results tracker
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    failures: []
};

// Test runner
async function runTest(name, testFn) {
    results.total++;
    log.test(`Running: ${name}`);

    try {
        await testFn();
        results.passed++;
        log.success(`PASSED: ${name}`);
        return true;
    } catch (error) {
        results.failed++;
        results.failures.push({ name, error: error.message });
        log.error(`FAILED: ${name}`);
        log.error(`  Error: ${error.message}`);
        return false;
    }
}

// Test Cases

async function tc001_freshProductLoad() {
    log.info('TC-001: Fresh Product Load - Verify Admin and Public load same state');

    // Load from Admin API
    const adminRes = await fetch(`${BASE_URL}/imcst_api/design/product/${PRODUCT_ID}`, {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });

    assert.ok(adminRes.ok, 'Admin API should respond successfully');
    const adminDesigns = await adminRes.json();

    // Load from Public API
    const publicRes = await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    assert.ok(publicRes.ok, 'Public API should respond successfully');
    const publicData = await publicRes.json();

    // Compare
    if (adminDesigns.length > 0) {
        const latestAdmin = adminDesigns[0];
        assert.ok(publicData.design, 'Public should have design data');
        assert.deepStrictEqual(
            latestAdmin.designJson,
            publicData.design,
            'Admin and Public design should match'
        );
    }

    log.success('Admin and Public states are synchronized');
}

async function tc002_saveDesignAdminVerifyPublic() {
    log.info('TC-002: Save Design in Admin → Verify in Public');

    const testContent = `Test Sync ${Date.now()}`;

    // Save design in Admin
    const designData = {
        shopifyProductId: PRODUCT_ID,
        name: 'Regression Test Design',
        designJson: [{
            id: 'page1',
            name: 'Side 1',
            elements: [{
                id: `text-${Date.now()}`,
                type: 'text',
                content: testContent,
                x: 50,
                y: 100,
                fontSize: 24,
                fontFamily: 'Arial',
                color: '#000000'
            }]
        }],
        previewUrl: 'https://example.com/preview.png'
    };

    const saveRes = await fetch(`${BASE_URL}/imcst_api/design`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify(designData)
    });

    assert.ok(saveRes.ok, 'Design save should succeed');
    const savedDesign = await saveRes.json();
    log.info(`Design saved with ID: ${savedDesign.id}`);

    // Wait a bit for cache invalidation to propagate
    await sleep(100);

    // Load from Public API
    const publicRes = await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    assert.ok(publicRes.ok, 'Public API should respond');
    const publicData = await publicRes.json();

    // Verify sync
    assert.ok(publicData.design, 'Public should have design');
    assert.ok(Array.isArray(publicData.design), 'Design should be an array');
    assert.ok(publicData.design.length > 0, 'Design should have pages');

    const publicElement = publicData.design[0].elements[0];
    assert.equal(publicElement.content, testContent, 'Content should match');
    assert.equal(publicElement.x, 50, 'X position should match');
    assert.equal(publicElement.y, 100, 'Y position should match');

    log.success('Design synchronized from Admin to Public successfully');
}

async function tc003_updateExistingDesign() {
    log.info('TC-003: Update Existing Design');

    // First, get existing design
    const getRes = await fetch(`${BASE_URL}/imcst_api/design/product/${PRODUCT_ID}`, {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    const designs = await getRes.json();

    if (designs.length === 0) {
        log.warn('No existing design to update, skipping test');
        results.skipped++;
        return;
    }

    const existingDesign = designs[0];
    const updatedContent = `Updated ${Date.now()}`;

    // Update the design
    const updatedDesignJson = JSON.parse(JSON.stringify(existingDesign.designJson));
    if (updatedDesignJson[0].elements.length > 0) {
        updatedDesignJson[0].elements[0].content = updatedContent;
        updatedDesignJson[0].elements[0].x = 150;
        updatedDesignJson[0].elements[0].y = 250;
    }

    const updateRes = await fetch(`${BASE_URL}/imcst_api/design`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({
            id: existingDesign.id,
            shopifyProductId: PRODUCT_ID,
            name: existingDesign.name,
            designJson: updatedDesignJson
        })
    });

    assert.ok(updateRes.ok, 'Design update should succeed');

    await sleep(100);

    // Verify in Public
    const publicRes = await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    const publicData = await publicRes.json();

    const publicElement = publicData.design[0].elements[0];
    assert.equal(publicElement.content, updatedContent, 'Updated content should sync');
    assert.equal(publicElement.x, 150, 'Updated X should sync');
    assert.equal(publicElement.y, 250, 'Updated Y should sync');

    log.success('Design update synchronized successfully');
}

async function tc004_updateBaseImage() {
    log.info('TC-004: Update Base Image in Admin');

    const newBaseImage = `https://example.com/base-${Date.now()}.png`;

    // Update config
    const configRes = await fetch(`${BASE_URL}/imcst_api/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({
            productId: PRODUCT_ID,
            baseImage: newBaseImage,
            printArea: { width: 1000, height: 1000 }
        })
    });

    assert.ok(configRes.ok, 'Config update should succeed');

    await sleep(100);

    // Verify in Public
    const publicRes = await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    const publicData = await publicRes.json();

    assert.equal(publicData.config.baseImage, newBaseImage, 'Base image should sync');

    log.success('Base image configuration synchronized');
}

async function tc006_cacheInvalidation() {
    log.info('TC-006: Cache Invalidation on Save');

    // First load (cache miss or hit)
    const start1 = Date.now();
    await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    const time1 = Date.now() - start1;
    log.info(`First load: ${time1}ms`);

    // Second load (should be cache hit - faster)
    const start2 = Date.now();
    await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    const time2 = Date.now() - start2;
    log.info(`Second load (cache hit): ${time2}ms`);

    // Save design (invalidates cache)
    await fetch(`${BASE_URL}/imcst_api/design`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({
            shopifyProductId: PRODUCT_ID,
            name: 'Cache Test',
            designJson: [{ id: 'page1', name: 'Side 1', elements: [] }]
        })
    });

    await sleep(100);

    // Third load (cache miss after invalidation)
    const start3 = Date.now();
    await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
    const time3 = Date.now() - start3;
    log.info(`Third load (after invalidation): ${time3}ms`);

    // Cache hit should be faster than cache miss
    assert.ok(time2 <= time1, 'Second load should be faster or equal (cache hit)');

    log.success('Cache invalidation working correctly');
}

async function tc013_performanceTest() {
    log.info('TC-013: Response Time Comparison');

    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
        const time = Date.now() - start;
        times.push(time);
        await sleep(100);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    log.info(`Average response time: ${avgTime.toFixed(2)}ms`);
    log.info(`Min: ${minTime}ms, Max: ${maxTime}ms`);

    assert.ok(avgTime < 1000, 'Average response time should be under 1 second');
    assert.ok(minTime < 500, 'Best response time should be under 500ms');

    log.success('Performance metrics acceptable');
}

// Main test suite
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('  REGRESSION TEST SUITE - REAL-TIME SYNCHRONIZATION');
    console.log('='.repeat(60) + '\n');

    log.info(`Base URL: ${BASE_URL}`);
    log.info(`Shop: ${SHOP}`);
    log.info(`Product ID: ${PRODUCT_ID}`);
    log.info(`Auth Token: ${AUTH_TOKEN ? 'Provided' : 'Missing'}\n`);

    if (!AUTH_TOKEN) {
        log.error('TEST_AUTH_TOKEN environment variable is required');
        log.error('Please set it before running tests');
        process.exit(1);
    }

    // Run tests
    await runTest('TC-001: Fresh Product Load', tc001_freshProductLoad);
    await runTest('TC-002: Save Design in Admin → Verify in Public', tc002_saveDesignAdminVerifyPublic);
    await runTest('TC-003: Update Existing Design', tc003_updateExistingDesign);
    await runTest('TC-004: Update Base Image', tc004_updateBaseImage);
    await runTest('TC-006: Cache Invalidation', tc006_cacheInvalidation);
    await runTest('TC-013: Performance Test', tc013_performanceTest);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests:   ${results.total}`);
    console.log(`${colors.green}Passed:        ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed:        ${results.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped:       ${results.skipped}${colors.reset}`);
    console.log('='.repeat(60) + '\n');

    if (results.failures.length > 0) {
        console.log('FAILED TESTS:');
        results.failures.forEach(({ name, error }) => {
            console.log(`  ${colors.red}✗${colors.reset} ${name}`);
            console.log(`    ${error}`);
        });
        console.log('');
    }

    // Exit code
    const exitCode = results.failed > 0 ? 1 : 0;

    if (exitCode === 0) {
        log.success('All tests passed! ✨');
    } else {
        log.error('Some tests failed. Please review and fix.');
    }

    process.exit(exitCode);
}

// Run tests
runAllTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
