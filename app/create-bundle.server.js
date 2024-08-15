import { authenticate } from "./shopify.server";
import prisma from "./db.server";

function getMediaContentType(mimeType) {
  const mimeTypeMap = {
    'image/jpeg': 'IMAGE',
    'image/png': 'IMAGE',
    'image/gif': 'IMAGE',
    'image/webp': 'IMAGE',
    'image/svg+xml': 'IMAGE',
    'video/mp4': 'VIDEO',
    'video/webm': 'VIDEO',
    'video/ogg': 'VIDEO',
    'model/gltf-binary': 'MODEL_3D',
    'model/gltf+json': 'MODEL_3D'
  };

  return mimeTypeMap[mimeType] || 'IMAGE'; // Default to IMAGE if type is unknown
}

function calculateDiscountedPrice(originalPrice, discountType, discountValue) {
  if (discountType === 'percentage') {
    return originalPrice * (1 - discountValue / 100);
  } else if (discountType === 'fixed') {
    return Math.max(0, originalPrice - discountValue);
  }
  return originalPrice;
}

export async function createBundle(request, formData) {
  const { admin } = await authenticate.admin(request);
  const bundleData = JSON.parse(formData.get('formData'));
  const session = await prisma.session.findFirst();
  if (!session) {
    throw new Error("No session found. Please ensure you have at least one session in the database.");
  }
  
  const offerData = {
    ProductBundleId: null,
    bundleName: bundleData.bundleName,
    description: bundleData.description,
    discountType: bundleData.discountType,
    discountValue: bundleData.discountValue,
    products: JSON.stringify(bundleData.products),
    userId: session.id,
  };
  
  const createdBundle = await prisma.bundle.create({ data: offerData });

  const CREATE_PRODUCT_BUNDLE_MUTATION = `
  mutation ProductBundleCreate($input: ProductBundleCreateInput!) {
    productBundleCreate(input: $input) {
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

  const JOB_POLLER_QUERY = `
  query JobPoller($jobId: ID!, $componentLimit: Int = 50) {
    productOperation(id: $jobId) {
      ... on ProductBundleOperation {
        id
        status
        product {
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
        userErrors {
          field
          message
          code
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
    handle
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
    variants(first: 250) {
      edges {
        node {
          id
          price
          compareAtPrice
          __typename
        }
        __typename
      }
      __typename
    }
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

  const UPDATE_PRODUCT_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
  `;

  const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
      }
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
  `;

  const STAGED_UPLOADS_CREATE_MUTATION = `
  mutation UploadStagedMedia($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
          __typename
        }
        __typename
      }
      userErrors {
        field
        message
        __typename
      }
      __typename
    }
  }
  `;

  const PRODUCT_CREATE_MEDIA = `
  mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on Media {
          mediaContentType
          __typename
        }
        ...MediaFragment
        __typename
      }
      mediaUserErrors {
        field
        message
        __typename
      }
      __typename
    }
  }

  fragment MediaFragment on File {
    id
    alt
    status: fileStatus
    mediaErrors: fileErrors {
      message
      code
      __typename
    }
    preview {
      status
      image {
        id
        transformedSrc: url(transform: {maxWidth: 200, maxHeight: 200})
        originalSrc: url
        width
        height
        __typename
      }
      __typename
    }
    ... on MediaImage {
      mimeType
      image {
        id
        originalSrc: url
        width
        height
        __typename
      }
      __typename
    }
    ... on ExternalVideo {
      embeddedUrl
      __typename
    }
    ... on Video {
      filename
      sources {
        height
        mimeType
        url
        width
        __typename
      }
      __typename
    }
    ... on Model3d {
      filename
      originalSource {
        url
        format
        mimeType
        filesize
        __typename
      }
      sources {
        format
        url
        filesize
        __typename
      }
      boundingBox {
        size {
          x
          y
          z
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
  `;

  try {
    const createProductResponse = await admin.graphql(CREATE_PRODUCT_BUNDLE_MUTATION, {
      variables: {
        input: {
          title: bundleData.bundleName,
          components: bundleData.products.map((product) => ({
            quantity: product.quantity,
            productId: product.id,
            optionSelections: product.options.map((option) => ({
              componentOptionId: option.id,
              name: `${product.title} ${option.name}`,
              values: option.values
            }))
          }))
        }
      }
    });

    const productBundleData = await createProductResponse.json();

    if (productBundleData.data.productBundleCreate.userErrors.length > 0) {
      throw new Error(productBundleData.data.productBundleCreate.userErrors[0].message);
    }

    const jobId = productBundleData.data.productBundleCreate.productBundleOperation.id;

    // Implement polling mechanism
    const pollInterval = 1000; // 1 second
    const timeout = 20000; // 20 seconds
    const startTime = Date.now();

    let productId;
    let pollData;
    while (true) {
      const pollResponse = await admin.graphql(JOB_POLLER_QUERY, {
        variables: {
          componentLimit: 50,
          jobId: jobId
        }
      });

      pollData = await pollResponse.json();
      const status = pollData.data.productOperation.status;

      if (status === 'COMPLETE') {
        productId = pollData.data.productOperation.product.id;
        console.log(pollData.data);

        // Update the bundle with the ProductBundleId
        await prisma.bundle.update({
          where: { id: createdBundle.id },
          data: {
            ProductBundleId: productId,
            ProductHandle: pollData.data.productOperation.product.handle
          }
        });

        break;
      } else if (status === 'FAILED') {
        throw new Error('Job failed: ' + JSON.stringify(pollData.data.productOperation.userErrors));
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Job timed out after ' + (timeout / 1000) + ' seconds');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Prepare staged uploads input
    const stagedUploadsInput = bundleData.media.map((media, index) => {
      const file = formData.get(`media_${index}`);
      if (!file) {
        throw new Error(`File not found for media: ${media.name}`);
      }
      return {
        filename: media.name,
        mimeType: media.type,
        httpMethod: "POST",
        fileSize: `${media.size}`,
        resource: getMediaContentType(media.type)
      };
    });
    
    console.log("Staged Uploads Input:", stagedUploadsInput);

    // Create staged uploads
    const stagedUploadsResponse = await admin.graphql(STAGED_UPLOADS_CREATE_MUTATION, {
      variables: { input: stagedUploadsInput }
    });

    const stagedUploadsData = await stagedUploadsResponse.json();
    console.log("Staged Uploads Data:", stagedUploadsData.data.stagedUploadsCreate.stagedTargets);

    const stagedTargets = stagedUploadsData.data.stagedUploadsCreate.stagedTargets;

    // Upload files to staged targets
    for (let i = 0; i < bundleData.media.length; i++) {
      const media = bundleData.media[i];
      const target = stagedTargets[i];
      const file = formData.get(`media_${i}`);
      if (!file) {
        throw new Error(`File not found for media: ${media.name}`);
      }
      
      const uploadFormData = new FormData();
      
      // Append all parameters from the staged upload
      target.parameters.forEach(param => {
        uploadFormData.append(param.name, param.value);
      });
      
      // Append the file
      uploadFormData.append('file', file);
      
      try {
        const response = await fetch(target.url, {
          method: 'POST',
          body: uploadFormData,
        }); 

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log(`File ${media.name} uploaded successfully`);
      } catch (error) {
        console.error(`Error uploading file ${media.name}:`, error);
        throw error;
      }
    }

    // Prepare media create input
    const mediaCreateInput = bundleData.media.map((media, index) => ({
      mediaContentType: getMediaContentType(media.type),
      originalSource: stagedTargets[index].resourceUrl,
      alt: media.altText || '',
    }));

    console.log("Media Create Input:", mediaCreateInput);

    // Create media
    const mediaCreateResponse = await admin.graphql(PRODUCT_CREATE_MEDIA, {
      variables: {
        productId: productId,
        media: mediaCreateInput
      }
    });

    const mediaCreateResult = await mediaCreateResponse.json();

    if (mediaCreateResult.data.productCreateMedia.mediaUserErrors.length > 0) {
      console.error('Error creating media:', JSON.stringify(mediaCreateResult.data.productCreateMedia.mediaUserErrors));
    } else {
      console.log('Media created successfully');
    }

    // Update the product details
    const updateProductResponse = await admin.graphql(UPDATE_PRODUCT_MUTATION, {
      variables: {
        input: {
          id: productId,
          descriptionHtml: bundleData.description,
          collectionsToJoin: bundleData.collectionsToJoin.map(collection => collection.id),
          status: bundleData.status.toUpperCase(),
          tags: bundleData.productTags,
          productType: bundleData.productType
        }
      }
    });

    const updateProductResult = await updateProductResponse.json();

    if (updateProductResult.data.productUpdate.userErrors.length > 0) {
      console.error('Error updating product:', JSON.stringify(updateProductResult.data.productUpdate.userErrors));
    } else {
      console.log('Product updated successfully');
    }

    // Update variant prices
    const variants = pollData.data.productOperation.product.variants.edges.map(edge => edge.node);
    const updatedVariants = variants.map(variant => ({
      id: variant.id,
      compareAtPrice: variant.price,
      price: calculateDiscountedPrice(parseFloat(variant.price), bundleData.discountType, parseFloat(bundleData.discountValue)).toFixed(2)
    }));

    const updateVariantsResponse = await admin.graphql(PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
      variables: {
        productId: productId,
        variants: updatedVariants
      }
    });

    const updateVariantsResult = await updateVariantsResponse.json();

    if (updateVariantsResult.data.productVariantsBulkUpdate.userErrors.length > 0) {
      console.error('Error updating variant prices:', JSON.stringify(updateVariantsResult.data.productVariantsBulkUpdate.userErrors));
    } else {
      console.log('Variant prices updated successfully');
    }

    return {
      success: true,
      message: "Bundle created, product updated, media uploaded, and variant prices updated successfully",
      productId: productId,
      stagedUploadsData: stagedUploadsData,
      mediaCreateResult: mediaCreateResult
    };
  } catch (error) {
    console.error("Error creating bundle:", error);
    throw error;
  }
}