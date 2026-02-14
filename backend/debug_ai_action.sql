-- Debug AI Action - Check what happened

-- 1. Check latest AI actions
SELECT 
  id, 
  "actionType", 
  status, 
  output->>'payload' as payload,
  "createdAt"
FROM "AIAction"
WHERE shop = 'uploadfly-lab.myshopify.com'
ORDER BY "createdAt" DESC
LIMIT 5;

-- 2. Check MerchantConfig for product
SELECT 
  "shopifyProductId", 
  "printArea", 
  "enabledTools", 
  "optionAssetId"
FROM "MerchantConfig"
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND "shopifyProductId" = '8232157511714';

-- 3. Check Assets created
SELECT 
  id, 
  type, 
  name, 
  label, 
  "createdAt"
FROM "Asset"
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND type = 'option'
ORDER BY "createdAt" DESC
LIMIT 5;

-- 4. Check latest action output detail
SELECT 
  id,
  status,
  output,
  changes
FROM "AIAction"
WHERE shop = 'uploadfly-lab.myshopify.com'
ORDER BY "createdAt" DESC
LIMIT 1;
