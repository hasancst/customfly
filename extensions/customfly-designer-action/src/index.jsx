import { extend, AdminAction } from '@shopify/ui-extensions/admin';

extend('admin.product-details.more-actions', async (root, api) => {
  const { data } = api;
  
  // Get product ID from context
  const productId = data.selected[0]?.id;
  
  if (!productId) {
    console.error('[Customfly] No product ID found');
    return;
  }

  // Extract numeric ID from GID
  const numericId = productId.split('/').pop();
  
  // Create action
  const action = root.createComponent(AdminAction, {
    title: 'Customfly Designer',
    onPress: async () => {
      // Get current shop domain
      const shop = api.shop.myshopifyDomain;
      
      // Build designer URL
      const designerUrl = `https://${shop}/admin/apps/customfly-hasan-10/designer/${numericId}`;
      
      // Navigate to designer
      await api.navigation.navigate(designerUrl);
    },
  });

  root.appendChild(action);
});
