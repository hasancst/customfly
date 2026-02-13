// Simulate what happens in the frontend
async function simulateFrontendFlow() {
    const shop = 'uploadfly-lab.myshopify.com';
    const productId = '8214119219234';
    const baseUrl = 'http://localhost:3011';

    console.log('\n=== Simulating Frontend Data Flow ===\n');

    // Step 1: Fetch data (like DirectProductDesigner.init())
    const prodRes = await fetch(`${baseUrl}/imcst_public_api/product/${shop}/${productId}?t=${Date.now()}`);
    const prodData = await prodRes.json();

    console.log('Step 1: Data fetched from API');
    console.log('  - hasConfig:', !!prodData.config);
    console.log('  - hasDesign:', !!prodData.design);
    console.log('  - hasProduct:', !!prodData.product);

    // Step 2: Set shopifyProduct state
    const shopifyProduct = prodData.product;
    console.log('\nStep 2: shopifyProduct state set');
    console.log('  - Title:', shopifyProduct?.title);
    console.log('  - Options:', shopifyProduct?.options);

    // Step 3: Set pages state
    let pages;
    if (prodData.design && prodData.design.length > 0) {
        pages = prodData.design;
        console.log('\nStep 3: Using design template');
        console.log('  - Pages count:', pages.length);
        console.log('  - First page elements:', pages[0].elements?.length || 0);
    } else {
        // No saved design, create initial page from config
        const initialSide = {
            id: 'default',
            name: 'Side 1',
            elements: [],  // ← THIS IS THE PROBLEM!
            baseImage: prodData.config.baseImage !== 'none' ? prodData.config.baseImage : '',
            baseImageProperties: prodData.config.baseImageProperties || { x: 0, y: 0, scale: 1 }
        };
        pages = [initialSide];
        console.log('\nStep 3: No template, creating initial page');
        console.log('  - Pages count:', pages.length);
        console.log('  - First page elements:', pages[0].elements.length);
    }

    // Step 4: processedElements (from useMemo)
    const activePage = pages[0];
    const processedElements = activePage.elements.filter(el => {
        const isSupportedType = [
            'text', 'monogram', 'field', 'textarea',
            'image', 'gallery', 'dropdown', 'button',
            'checkbox', 'number', 'time', 'file_upload',
            'swatch', 'product_color', 'shape'
        ].includes(el.type);
        return isSupportedType && !el.isHiddenByLogic && !el.id.startsWith('gallery-added-');
    });

    console.log('\nStep 4: processedElements calculated');
    console.log('  - Count:', processedElements.length);

    // Step 5: PublicCustomizationPanel receives data
    const shopifyOptions = shopifyProduct?.options || [];
    const editableElements = processedElements;

    console.log('\nStep 5: PublicCustomizationPanel receives:');
    console.log('  - shopifyOptions.length:', shopifyOptions.length);
    console.log('  - editableElements.length:', editableElements.length);

    // Step 6: Check condition for "No customizable options" message
    const showNoOptionsMessage = editableElements.length === 0 && shopifyOptions.length === 0;

    console.log('\nStep 6: UI Rendering Decision');
    console.log('  - Show "No customizable options"?', showNoOptionsMessage);
    console.log('  - Show Shopify Options?', shopifyOptions.length > 0);
    console.log('  - Show Editable Elements?', editableElements.length > 0);

    if (shopifyOptions.length > 0) {
        console.log('\n✓ SHOPIFY OPTIONS SHOULD BE VISIBLE:');
        shopifyOptions.forEach((opt, idx) => {
            console.log(`  ${idx + 1}. ${opt.name}: [${opt.values?.join(', ')}]`);
        });
    } else {
        console.log('\n❌ NO SHOPIFY OPTIONS TO DISPLAY');
    }

    if (editableElements.length > 0) {
        console.log('\n✓ EDITABLE ELEMENTS SHOULD BE VISIBLE:');
        editableElements.forEach((el, idx) => {
            console.log(`  ${idx + 1}. ${el.type} - ${el.label || 'No label'}`);
        });
    } else {
        console.log('\n⚠️  NO EDITABLE ELEMENTS (No template configured)');
    }

    console.log('\n=== CONCLUSION ===');
    if (showNoOptionsMessage) {
        console.log('❌ "No customizable options" message will be shown');
        console.log('   This is WRONG if Shopify options exist!');
    } else {
        console.log('✓ Customization panel should show options');
    }
}

simulateFrontendFlow().catch(console.error);
