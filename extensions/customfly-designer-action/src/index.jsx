shopify.extend('admin.product-details.action.render', (root, api) => {
  const { data, close } = api;
  
  // Get product ID from context
  const productGid = data?.selected?.[0]?.id;
  
  if (!productGid) {
    return;
  }

  // Extract numeric ID from GID
  const numericId = productGid.split('/').pop();
  
  // Build designer URL - use full admin path
  const designerUrl = `shopify://admin/apps/customfly-hasan-10/designer/${numericId}`;
  
  // Redirect immediately
  window.open(designerUrl, '_top');
  
  // Close the modal
  if (close) {
    close();
  }
});
