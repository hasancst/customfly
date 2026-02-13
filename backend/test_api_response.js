async function testApiResponse() {
    const shop = 'uploadfly-lab.myshopify.com';
    const productId = '8214119219234';
    const baseUrl = 'http://localhost:3011';

    console.log(`\n=== Testing Public API Response ===`);
    console.log(`Shop: ${shop}`);
    console.log(`Product ID: ${productId}\n`);

    try {
        const res = await fetch(`${baseUrl}/imcst_public_api/product/${shop}/${productId}`);
        const data = await res.json();

        console.log('✓ Response Status:', res.status);
        console.log('\n--- Data Structure ---');
        console.log('Keys:', Object.keys(data));

        console.log('\n--- Config ---');
        if (data.config) {
            console.log('Config keys:', Object.keys(data.config));
            console.log('Header Title:', data.config.headerTitle);
            console.log('Button Text:', data.config.buttonText);
        } else {
            console.log('❌ Config is missing!');
        }

        console.log('\n--- Product Data ---');
        if (data.product) {
            console.log('Product Title:', data.product.title);
            console.log('Product ID:', data.product.id);
            console.log('Variants count:', data.product.variants?.length);
            console.log('Options:', data.product.options);
            if (data.product.options && data.product.options.length > 0) {
                console.log('\n  Shopify Options Details:');
                data.product.options.forEach((opt, idx) => {
                    console.log(`  ${idx + 1}. ${opt.name}: [${opt.values?.join(', ')}]`);
                });
            }
        } else {
            console.log('❌ Product data is missing!');
        }

        console.log('\n--- Design Template ---');
        if (data.design) {
            console.log('Design pages:', data.design.length);
            if (data.design.length > 0) {
                const firstPage = data.design[0];
                console.log('First page ID:', firstPage.id);
                console.log('First page elements count:', firstPage.elements?.length || 0);
                if (firstPage.elements && firstPage.elements.length > 0) {
                    console.log('\n  Elements:');
                    firstPage.elements.forEach((el, idx) => {
                        console.log(`  ${idx + 1}. Type: ${el.type}, ID: ${el.id}, Label: ${el.label || 'N/A'}`);
                    });
                } else {
                    console.log('  ⚠️  No elements in first page');
                }
            }
        } else {
            console.log('No template design (this is optional)');
        }

        console.log('\n=== Summary ===');
        const hasConfig = !!data.config;
        const hasProduct = !!data.product;
        const hasOptions = data.product?.options?.length > 0;
        const hasElements = data.design?.[0]?.elements?.length > 0;

        console.log(`Config: ${hasConfig ? '✓' : '❌'}`);
        console.log(`Product: ${hasProduct ? '✓' : '❌'}`);
        console.log(`Shopify Options: ${hasOptions ? '✓ (' + data.product.options.length + ')' : '❌'}`);
        console.log(`Design Elements: ${hasElements ? '✓ (' + data.design[0].elements.length + ')' : '❌'}`);

        if (!hasOptions && !hasElements) {
            console.log('\n⚠️  WARNING: Both Shopify options and design elements are missing!');
            console.log('This will cause "No customizable options" message in frontend.');
        }

    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
    }
}

testApiResponse();
