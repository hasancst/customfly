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
  
  // Use Shopify's app bridge to navigate
  const appUrl = `customfly-hasan-10/designer/${numericId}`;
  
  // Redirect using the app context
  await api.redirect.dispatch('APP', appUrl);
  
  // Close modal
  close();
});
