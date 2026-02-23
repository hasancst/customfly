shopify.extend('admin.product-details.action.render', async (root, api) => {
  const { data, close } = api;
  
  // Get product ID from context
  const productGid = data?.selected?.[0]?.id;
  
  if (!productGid) {
    close();
    return;
  }

  // Extract numeric ID from GID (format: gid://shopify/Product/123456)
  const numericId = productGid.split('/').pop();
  
  try {
    // Call backend to import product (creates config if not exists)
    const response = await fetch(`/api/products/${numericId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to import product');
    }
    
    const result = await response.json();
    
    // Redirect to designer
    const designerUrl = `customfly-hasan-10${result.designerUrl}`;
    await api.redirect.dispatch('APP', designerUrl);
  } catch (error) {
    console.error('Error importing product:', error);
    // Still try to redirect even if import fails
    const designerUrl = `customfly-hasan-10/designer/${numericId}`;
    await api.redirect.dispatch('APP', designerUrl);
  }
  
  // Close modal
  close();
});
