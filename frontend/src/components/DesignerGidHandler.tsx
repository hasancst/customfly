import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Designer from '@/pages/Designer';

/**
 * Wrapper component that handles GID format from admin_link extensions
 * and query parameter format from admin links
 * 
 * Converts:
 * - gid://shopify/Product/123 to numeric ID 123
 * - /designer/:id?id=123 to /designer/123
 */
export default function DesignerGidHandler() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryId = searchParams.get('id');
    
    // Case 1: ID is in query parameter (from admin_link with :id)
    if (queryId && productId === ':id') {
      console.log('[DesignerGidHandler] Converting query param to path:', { queryId });
      
      // Remove id from query params
      searchParams.delete('id');
      const newSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
      
      // Redirect to clean URL with ID in path
      navigate(`/designer/${queryId}${newSearch}`, { replace: true });
      return;
    }
    
    // Case 2: ID is in query parameter but path has numeric ID (shouldn't happen but handle it)
    if (queryId && productId && productId !== ':id' && queryId !== productId) {
      console.log('[DesignerGidHandler] Query ID differs from path ID, using path:', { pathId: productId, queryId });
      
      // Remove id from query params and use path ID
      searchParams.delete('id');
      const newSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
      
      navigate(`/designer/${productId}${newSearch}`, { replace: true });
      return;
    }
    
    if (productId && productId !== ':id') {
      // Case 3: Check if productId is in GID format
      if (productId.includes('gid://shopify/Product/')) {
        // Extract numeric ID from GID
        const numericId = productId.split('/').pop();
        console.log('[DesignerGidHandler] Converting GID to numeric ID:', { gid: productId, numericId });
        
        // Redirect to numeric ID URL
        navigate(`/designer/${numericId}${location.search}`, { replace: true });
      } else if (productId.includes('gid%3A%2F%2Fshopify%2FProduct%2F')) {
        // Case 4: Handle URL-encoded GID
        const decoded = decodeURIComponent(productId);
        const numericId = decoded.split('/').pop();
        console.log('[DesignerGidHandler] Converting encoded GID to numeric ID:', { encoded: productId, decoded, numericId });
        
        navigate(`/designer/${numericId}${location.search}`, { replace: true });
      }
    }
  }, [productId, navigate, location.search, location.pathname]);

  // If productId is already numeric or conversion is in progress, render Designer
  return <Designer />;
}
