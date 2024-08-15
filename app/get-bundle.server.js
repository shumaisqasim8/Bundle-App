import { authenticate } from "./shopify.server";

export async function getBundle(request, bundleId) {
  const { admin } = await authenticate.admin(request);
  
  // Fetch the existing bundle data
  const FETCH_BUNDLE_QUERY = `
  query ProductBundle($id: ID!, $componentLimit: Int = 50) {
    product(id: $id) {
      ...ProductFragment
      bundleComponents(first: $componentLimit) {
        edges {
          node {
            ...ProductComponentFragment
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
  
  fragment ProductFragment on Product {
    id
    title
    featuredImage {
      id
      url: url(transform: {maxWidth: 80, maxHeight: 80})
      altText
      __typename
    }
    options(first: 3) {
      id
      name
      values
      __typename
    }
    hasOnlyDefaultVariant
    __typename
  }
  
  fragment ProductComponentFragment on ProductBundleComponent {
    componentProduct {
      ...ProductFragment
      __typename
    }
    optionSelections {
      componentOption {
        id
        name
        __typename
      }
      parentOption {
        id
        name
        __typename
      }
      values {
        selectionStatus
        value
        __typename
      }
      __typename
    }
    quantity
    quantityOption {
      name
      parentOption {
        id
        __typename
      }
      values {
        name
        quantity
        __typename
      }
      __typename
    }
    __typename
  }
  
  `;

  const fetchBundleResponse = await admin.graphql(FETCH_BUNDLE_QUERY, {
    variables: {
      id: `gid://shopify/Product/${bundleId}`,
      componentLimit: 50
    }
  });

  const bundleData = await fetchBundleResponse.json();
  return bundleData;
}