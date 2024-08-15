import { authenticate } from "./shopify.server";

export async function fetchShopInfo(request) {
  const { admin } = await authenticate.admin(request);
  
    const FETCH_SHOP_INFO = `
  query {
    shop {
      name
      allProductCategoriesList{
        id
        fullName
        
      }
      productTags(first:250){
      edges {
          node 
          }
       }
       productTypes(first:250){
        edges {
            node 
            }
         }
      resourceLimits {
        maxProductVariants
      }
    }
  }
  `;
    
    const shop = await admin.graphql(FETCH_SHOP_INFO);
  const shopDetails = await shop.json();
  
    return shopDetails;
}