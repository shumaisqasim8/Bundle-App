import { authenticate } from "./shopify.server";

export async function updateBundle(request, formData) {
  const { admin } = await authenticate.admin(request);
  const updateBundleData = JSON.parse(formData.get('formData'));

  try {

    // Update the bundle data
    const UPDATE_PRODUCT_BUNDLE_MUTATION = `
  mutation productBundleUpdate($input: ProductBundleUpdateInput!) {
    productBundleUpdate(input: $input) {
      productBundleOperation {
        id
        product {
          id
        }
        __typename
      }
      userErrors {
        message
        __typename
      }
      __typename
    }
  }
  `;


    const UpdateProductResponse = await admin.graphql(UPDATE_PRODUCT_BUNDLE_MUTATION, {
      variables: {
        "input": {
          "productId": updateBundleData.id,
          "components": updateBundleData.products.map((product) => ({
            "quantity": product.quantity,
            "productId": product.id,
            "optionSelections": product.options.map((option) => ({
              "componentOptionId": option.id,
              "name": `${product.title} ${option.name}`,
              "values": option.values
            }))
          }))
        }
      }
    });

    const updatedProductBundleData = await UpdateProductResponse.json();

    return {
      success: true,
      message: "Bundle created, product updated, and discount applied successfully",
      updatedProductBundleData,
    };
  } catch (error) {
    console.error('Error updating bundle:', error);
    return {
      success: false,
      message: "Error updating bundle",
      error,
    };
  }
}