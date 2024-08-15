import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
      case "PRODUCTS_UPDATE":
        console.log("Product Update",payload.admin_graphql_api_id);
        // const allBundles = await db.session.findUnique({
        //   where: {
        //       id: session.id
        //     },
        //   include: {
        //       bundles: true
        //   }
        // });
        
        // for (const bundle of allBundles.bundles) {
        //   const bundleProducts = JSON.parse(bundle.products);
        //   const bundleProduct = bundleProducts.find(product => product.id === updatedProductId);
          
        //   if (bundleProduct) {
            
        //     for (const payloadVariant of payload.variants) {
        //       const bundleVariant = bundleProduct.variants.find(v => v.id === payloadVariant.admin_graphql_api_id);
              
        //       if (bundleVariant) {
        //         if (
        //           payloadVariant.price !== bundleVariant.price ||
        //           payloadVariant.compare_at_price !== bundleVariant.compareAtPrice
        //         )
        //          {
        //               bundleVariant.price = payloadVariant.price;
        //               bundleVariant.compareAtPrice = payloadVariant.compare_at_price;
        //               const productIndex = bundleProducts.findIndex(product => product.id === updatedProductId);
        //               const variantIndex = bundleProducts[productIndex].variants.findIndex(v => v.id === payloadVariant.id);
        //               bundleProducts[productIndex].variants[variantIndex] = bundleVariant;
        //               try {
        //                   await db.bundle.update({
        //                       where: { id: bundle.id },
        //                       data: {
        //                           products: JSON.stringify(bundleProducts)
        //                       }
        //                   });
                         
        //                   const UPDATE_PRODUCT_BUNDLE_MUTATION = `
        //             mutation productBundleUpdate($input: ProductBundleUpdateInput!) {
        //               productBundleUpdate(input: $input) {
        //                 productBundleOperation {
        //                   id
        //                   product {
        //                     id
        //                   }
        //                   __typename
        //                 }
        //                 userErrors {
        //                   message
        //                   __typename
        //                 }
        //                 __typename
        //               }
        //             }
        //                   `;
        //                   const JOB_POLLER_QUERY = `
        //             query JobPoller($jobId: ID!, $componentLimit: Int = 50) {
        //               productOperation(id: $jobId) {
        //                 ... on ProductBundleOperation {
        //                   id
        //                   status
        //                   product {
        //                     ...ProductFragment
        //                     bundleComponents(first: $componentLimit) {
        //                       edges {
        //                         node {
        //                           ...ProductComponentFragment
        //                           __typename
        //                         }
        //                         __typename
        //                       }
        //                       __typename
        //                     }
        //                     __typename
        //                   }
        //                   userErrors {
        //                     field
        //                     message
        //                     code
        //                     __typename
        //                   }
        //                   __typename
        //                 }
        //                 __typename
        //               }
        //             }
                    
        //             fragment ProductFragment on Product {
        //               id
        //               title
        //               handle
        //               featuredImage {
        //                 id
        //                 url: url(transform: {maxWidth: 80, maxHeight: 80})
        //                 altText
        //                 __typename
        //               }
        //               options(first: 3) {
        //                 id
        //                 name
        //                 values
        //                 __typename
        //               }
        //               hasOnlyDefaultVariant
        //               variants(first: 250) {
        //                 edges {
        //                   node {
        //                     id
        //                     price
        //                     compareAtPrice
        //                     __typename
        //                   }
        //                   __typename
        //                 }
        //                 __typename
        //               }
        //               __typename
        //             }
                    
        //             fragment ProductComponentFragment on ProductBundleComponent {
        //               componentProduct {
        //                 ...ProductFragment
        //                 __typename
        //               }
        //               optionSelections {
        //                 componentOption {
        //                   id
        //                   name
        //                   __typename
        //                 }
        //                 parentOption {
        //                   id
        //                   name
        //                   __typename
        //                 }
        //                 values {
        //                   selectionStatus
        //                   value
        //                   __typename
        //                 }
        //                 __typename
        //               }
        //               quantity
        //               quantityOption {
        //                 name
        //                 parentOption {
        //                   id
        //                   __typename
        //                 }
        //                 values {
        //                   name
        //                   quantity
        //                   __typename
        //                 }
        //                 __typename
        //               }
        //               __typename
        //             }
        //                   `;
        //                   const updateProductResponse = await admin.graphql(UPDATE_PRODUCT_BUNDLE_MUTATION, {
        //                 variables: {
        //                   input: {
        //                     title: bundle.bundleName,
        //                     productId: bundle.ProductBundleId,
        //                     components: bundleProducts.map((product) => ({
        //                       quantity: product.quantity,
        //                       productId: product.id,
        //                       optionSelections: product.options.map((option) => ({
        //                         componentOptionId: option.id,
        //                         name: `${product.title} ${option.name}`,
        //                         values: option.values
        //                       }))
        //                     }))
        //                   }
        //                 }
        //                   });
        //                   console.log("This is the response", updateProductResponse);
        //                   const productBundleData = await updateProductResponse.json();
        //                   if (productBundleData.data.productBundleUpdate.userErrors.length > 0) {
        //                     throw new Error(productBundleData.data.productBundleUpdate.userErrors[0].message);
        //                   }
        //                   const jobId = productBundleData.data.productBundleUpdate.productBundleOperation.id;
        //                   const pollInterval = 1000; // 1 second
        //                   const timeout = 20000; // 20 seconds
        //                   const startTime = Date.now();

        //                   let productId;
        //                   while (true) {
        //                   const pollResponse = await admin.graphql(JOB_POLLER_QUERY, {
        //                     variables: {
        //                       componentLimit: 50,
        //                       jobId: jobId
        //                     }
        //                   });
        //                 const pollData = await pollResponse.json();
        //                 const status = pollData.data.productOperation.status;
        //                 if (status === 'COMPLETE') {
        //                    productId = pollData.data.productOperation.product.id;
        //                   const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = `
        //                         mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        //                           productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        //                             product {
        //                               id
        //                             }
        //                             productVariants {
        //                               id
        //                               price
        //                             }
        //                             userErrors {
        //                               field
        //                               message
        //                             }
        //                           }
        //                         }
        //                         `;
        //                         // Update variant prices
        //                           const variants = pollData.data.productOperation.product.variants.edges.map(edge => edge.node);
        //                           const updatedVariants = variants.map(variant => ({
        //                             id: variant.id,
        //                             compareAtPrice: variant.price,
        //                             price: calculateDiscountedPrice(parseFloat(variant.price), bundle.discountType, parseFloat(bundle.discountValue)).toFixed(2)
        //                           }));
        //                           const updateVariantsResponse = await admin.graphql(PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
        //                             variables: {
        //                               productId: productId,
        //                               variants: updatedVariants
        //                             }
        //                           });
        //                           const updateVariantsResult = await updateVariantsResponse.json();
        //                           console.log("Prices has been updated in the bundel", updateVariantsResult);
        //                           function calculateDiscountedPrice(originalPrice, discountType, discountValue) {
        //                               if (discountType === 'percentage') {
        //                                 return originalPrice * (1 - discountValue / 100);
        //                               } else if (discountType === 'fixed') {
        //                                 return Math.max(0, originalPrice - discountValue);
        //                               }
        //                               return originalPrice;
        //                             }
        //                             break;
        //                     }
        //                     else if (status === 'FAILED') {
        //                       throw new Error('Job failed: ' + JSON.stringify(pollData.data.productOperation.userErrors));
        //                     }
        //                     if (Date.now() - startTime > timeout) {
        //                       throw new Error('Job timed out after ' + (timeout / 1000) + ' seconds');
        //                     }
        //                     await new Promise(resolve => setTimeout(resolve, pollInterval));
        //                   }

                            
        //               } catch (error) {
        //                   console.error(`Error updating bundle ${bundle.bundleName}:`, error);
        //               }
        //         }
        //       }
        //     }
            
        //   }
        //   else{
        //     console.log("This product is not part of any bundle");
        //   }
        // }
        break;  
        case "ORDERS_CREATE":
          console.log("Order Created: ", payload);
          
          const subtotalPrice = payload.subtotal_price;
          const currency = payload.currency;
          
          try {
            // Fetch the current Analytics record for the user
            const currentAnalytics = await db.analytics.findFirst({
              where: { userId: session.id }
            });
        
            if (currentAnalytics) {
              // If an Analytics record exists, update it
              const updatedRevenue = (parseFloat(currentAnalytics.revenue) + parseFloat(subtotalPrice)).toString();
              const updatedOrders = (parseInt(currentAnalytics.orders) + 1).toString();
        
              await db.analytics.update({
                where: { id: currentAnalytics.id },
                data: {
                  revenue: updatedRevenue,
                  orders: updatedOrders
                }
              });
        
              console.log(`Updated Analytics: Revenue: ${updatedRevenue} ${currency}, Orders: ${updatedOrders}`);
            } else {
              // If no Analytics record exists, create a new one
              await db.analytics.create({
                data: {
                  revenue: subtotalPrice.toString(),
                  orders: "1",
                  userId: session.id
                }
              });
        
              console.log(`Created new Analytics: Revenue: ${subtotalPrice} ${currency}, Orders: 1`);
            }
          } catch (error) {
            console.error("Error updating Analytics:", error);
          }
          
          break;
      case "APP_UNINSTALLED":
      if (session) {
        await db.session.delete({
          where: {
            id: session.id
          }
        });
        console.log("Deleted app");
      }

      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
