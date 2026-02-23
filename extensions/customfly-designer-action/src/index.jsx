import React from 'react';
import { extend, render, Button } from '@shopify/ui-extensions-react/admin';

// Extend the admin product details page
function CustomflyDesignerAction({ data, shop }) {
  // Get product ID from context
  const productGid = data?.selected?.[0]?.id;
  
  if (!productGid) {
    return null;
  }

  // Extract numeric ID from GID
  const numericId = productGid.split('/').pop();
  
  // Handle button click
  const handleClick = () => {
    // Build designer URL
    const designerUrl = `/admin/apps/customfly-hasan-10/designer/${numericId}`;
    
    // Navigate to designer
    window.open(designerUrl, '_self');
  };

  return (
    <Button onPress={handleClick}>
      Customfly Designer
    </Button>
  );
}

// Default export required for Shopify extension
export default extend(
  'admin.product-details.action.render',
  render(CustomflyDesignerAction)
);
