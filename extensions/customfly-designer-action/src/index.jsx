shopify.extend('admin.product-details.action.render', (root, api) => {
  const { data } = api;
  
  // Get product ID from context
  const productGid = data?.selected?.[0]?.id;
  
  if (!productGid) {
    return;
  }

  // Extract numeric ID from GID
  const numericId = productGid.split('/').pop();
  
  // Create action button
  const button = root.createComponent('Button', {
    title: 'Customfly Designer',
    onPress: () => {
      // Build designer URL
      const designerUrl = `/admin/apps/customfly-hasan-10/designer/${numericId}`;
      
      // Navigate to designer
      api.navigation.navigate(designerUrl);
    },
  });

  root.appendChild(button);
});
