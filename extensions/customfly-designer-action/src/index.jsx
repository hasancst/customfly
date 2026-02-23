import { useEffect, useState } from 'react';
import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/admin';

const TARGET = 'admin.product-details.action.render';

export default reactExtension(TARGET, () => <CustomflyDesignerAction />);

function CustomflyDesignerAction() {
  const { navigation, data } = useApi(TARGET);
  const [status, setStatus] = useState('redirecting');

  // Get product ID from extension context
  // data.selected[0].id format: "gid://shopify/Product/123456789"
  const productGid = data?.selected?.[0]?.id || '';
  const numericId = productGid ? productGid.split('/').pop() : null;

  useEffect(() => {
    if (!numericId) {
      setStatus('error');
      return;
    }

    // Navigate directly to designer page
    // Designer page will auto-create config if product is not yet configured
    const designerUrl = `/designer/${numericId}`;

    // Small delay for UI feedback before redirecting
    const timer = setTimeout(() => {
      navigation.navigate(designerUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [numericId, navigation]);

  const handleNavigate = () => {
    if (numericId) {
      navigation.navigate(`/designer/${numericId}`);
    }
  };

  return (
    <AdminAction
      title="Customfly Designer"
      primaryAction={
        numericId
          ? {
            label: 'Buka Designer',
            onAction: handleNavigate,
          }
          : undefined
      }
      secondaryAction={{
        label: 'Batal',
        onAction: () => navigation.close(),
      }}
    >
      <BlockStack gap="large" inlineAlignment="center">
        {status === 'redirecting' && numericId && (
          <>
            <Text fontWeight="medium" tone="subdued">
              Membuka Product Designer...
            </Text>
            <Text tone="subdued">
              Produk akan otomatis ditambahkan jika belum ada di designer.
            </Text>
          </>
        )}

        {(!numericId || status === 'error') && (
          <Banner tone="critical">
            <Text>
              Tidak dapat menemukan ID produk. Silakan refresh halaman dan coba lagi.
            </Text>
          </Banner>
        )}
      </BlockStack>
    </AdminAction>
  );
}
