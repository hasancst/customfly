-- Check saved designs for this product
SELECT 
  id,
  name,
  "shopifyProductId",
  "isTemplate",
  "designJson",
  "createdAt",
  "updatedAt"
FROM "Design"
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND "shopifyProductId" = '8232157511714'
ORDER BY "updatedAt" DESC
LIMIT 3;
