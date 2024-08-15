import { authenticate } from "./shopify.server";

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

  return mimeTypeMap[mimeType] || 'IMAGE';
}

export async function uploadMedia(request, uploadData) {
  const { admin } = await authenticate.admin(request);

  const STAGED_UPLOADS_CREATE_MUTATION = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
    }
  }
`;

  try {
    // Prepare staged uploads input
    const stagedUploadsInput = uploadData.media
      .filter(media => media.src && media.mimeType)
      .map(media => ({
        filename: media.filename || `file.${media.mimeType.split('/')[1]}`,
        mimeType: media.mimeType,
        httpMethod: "POST",
        resource: getMediaContentType(media.mimeType)
      }));

    const stagedUpload = await admin.graphql(STAGED_UPLOADS_CREATE_MUTATION, {
      variables: {
        input: stagedUploadsInput
      }
    });

    const stagedUploadData = await stagedUpload.json();
    
    return stagedUploadData.data.stagedUploadsCreate.stagedTargets;
  } catch (error) {
    console.error('Error creating staged uploads:', error);
    throw error;
  }
}