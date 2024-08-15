import { authenticate } from "./shopify.server";

export async function fetchBundle(request) {
    const { admin } = await authenticate.admin(request);


    const GET_BUNDLE_PRODUCT_ID = ` 
    query AppPublicationId($handleOrKey: String!) {
        appByHandle: appByHandle(handle: $handleOrKey) {
          ...Publication
          __typename
        }
        appByKey: appByKey(apiKey: $handleOrKey) {
          ...Publication
          __typename
        }
      }
      
      fragment Publication on App {
        id
        installation {
          id
          publication {
            id
            __typename
          }
          __typename
        }
        __typename
      }
      `;


    const FETCH_BUNDLE_DATA = `
    query BundleProductsOwnedByAppQuery($query: String, $first: Int, $last: Int, $before: String, $after: String) {
        products(
          first: $first
          last: $last
          before: $before
          after: $after
          sortKey: CREATED_AT
          query: $query
        ) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
            startCursor
            __typename
          }
          edges {
            node {
              id
              title
              priceRangeV2 {
                maxVariantPrice {
                  amount
                  currencyCode
                  __typename
                }
                minVariantPrice {
                  amount
                  currencyCode
                  __typename
                }
                __typename
              }
              featuredImage {
                id
                url
                altText
                __typename
              }
              vendor
              totalInventory
              status
              hasOnlyDefaultVariant
              category{
                id
                fullName
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
      }
    `;


    try {

        const bundleProductId = await admin.graphql(GET_BUNDLE_PRODUCT_ID, {
            variables: {
                "handleOrKey": "bundler-46"
            }
        })
        
        const finalBundleProductId = await bundleProductId.json();
        const id = finalBundleProductId.data.appByHandle.id.split('/').pop();

        const bundleData = await admin.graphql(FETCH_BUNDLE_DATA, {
            variables: {
                "first": 20,
                "last": null,
                "before": null,
                "after": null,
                "query": `product_configuration_owner:${id}`
            }
        });

        const finalBundleData = await bundleData.json();

        return finalBundleData;


    }
    catch (error) {
        console.error(error);
    }

}