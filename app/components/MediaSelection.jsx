import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  DropZone,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Banner,
} from '@shopify/polaris';
import { PlusCircleIcon, XIcon } from '@shopify/polaris-icons';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGE_DIMENSIONS = 5000; // 5000 x 5000 px
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_VIDEO_LENGTH = 10 * 60; // 10 minutes in seconds
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1 GB

export default function MediaSelection({ onChange, initialFiles = [] }) {
  const [files, setFiles] = useState(initialFiles);
  const [thumbnails, setThumbnails] = useState({});
  const [error, setError] = useState('');

  const validateFile = (file) => {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      if (file.size > MAX_FILE_SIZE) {
        return "Image file size must be smaller than 20 MB.";
      }
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          if (img.width > MAX_IMAGE_DIMENSIONS || img.height > MAX_IMAGE_DIMENSIONS) {
            reject("Image dimensions must be 5000x5000 px or smaller.");
          } else {
            resolve();
          }
        };
        img.onerror = () => reject("Failed to load image.");
        img.src = URL.createObjectURL(file);
      });
    } else if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      if (file.size > MAX_VIDEO_SIZE) {
        return "Video file size must be smaller than 1 GB.";
      }
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          if (video.duration > MAX_VIDEO_LENGTH) {
            reject("Video length must be 10 minutes or less.");
          } else {
            resolve();
          }
        };
        video.onerror = () => reject("Failed to load video.");
        video.src = URL.createObjectURL(file);
      });
    } else {
      return "File type not supported. Please upload PNG, JPEG, GIF, BMP, WebP images or MP4, MOV videos.";
    }
  };

  const handleDropZoneDrop = useCallback(
    (_dropFiles, acceptedFiles, _rejectedFiles) => {
      const newFiles = acceptedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        src: URL.createObjectURL(file),
        file: file // Ensure we're keeping the actual file object
      }));

      console.log("New files added:", newFiles);

      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles, ...newFiles];
        console.log("Updated files:", updatedFiles);
        onChange(updatedFiles);
        return updatedFiles;
      });
    },
    [onChange]
  );

  const handleRemoveFile = useCallback(
    (index, event) => {
      event.stopPropagation();
      const newFiles = [...files];
      URL.revokeObjectURL(newFiles[index].src);
      newFiles.splice(index, 1);
      setFiles(newFiles);
      onChange(newFiles);
    },
    [files, onChange]
  );

  const generateVideoThumbnail = useCallback((file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadeddata = () => {
        video.currentTime = 1; // Set to 1 second to avoid black frames
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL();
        resolve(thumbnailUrl);
      };
      video.src = URL.createObjectURL(file.file); // Use the original File object
    });
  }, []);

  useEffect(() => {
    const generateThumbnails = async () => {
      const newThumbnails = { ...thumbnails };
      for (const file of files) {
        if (ACCEPTED_VIDEO_TYPES.includes(file.type) && !thumbnails[file.name]) {
          const thumbnail = await generateVideoThumbnail(file);
          newThumbnails[file.name] = thumbnail;
        }
      }
      setThumbnails(newThumbnails);
    };

    generateThumbnails();
  }, [files, generateVideoThumbnail, thumbnails]);

  const renderThumbnail = useCallback((file) => {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return file.src;
    } else if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return thumbnails[file.name] || file.src;
    }
  }, [thumbnails]);

  const mediaCards = (
    <InlineStack gap="400" wrap={true}>
      {files.map((file, index) => (
        <div key={index} style={{ position: 'relative', width: '100px', height: '100%' }}>
          <Card padding="0">
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <img
                src={renderThumbnail(file)}
                alt="Media thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </Card>
          <div
            onClick={(event) => handleRemoveFile(index, event)}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              cursor: 'pointer',
              background: 'white',
              borderRadius: '50%',
              padding: '2px'
            }}
          >
            <Icon source={XIcon} color="base" />
          </div>
        </div>
      ))}
      <div style={{ width: '100px', height: "100px" }}>
        <Card padding="0">
          <div style={{ width: '100%', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Icon source={PlusCircleIcon} color="base" />
          </div>
        </Card>
      </div>
    </InlineStack>
  );

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Media Selection
        </Text>
        {error && (
          <Banner status="critical">
            <p>{error}</p>
          </Banner>
        )}
        <DropZone 
          onDrop={handleDropZoneDrop}
          allowMultiple={true}
          accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',')}
          fullWidth
        >
          <div style={{ padding: '16px' }}>
            {mediaCards}
          </div>
        </DropZone>
      </BlockStack>
    </Card>
  );
}