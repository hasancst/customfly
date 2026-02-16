# Feature: AI Gallery with Automatic Image Download

**Date**: 2026-02-16  
**Status**: ✅ Complete  
**Type**: New Feature

## Overview

AI can now create gallery assets by downloading images from external URLs (Unsplash, Pexels, etc.) and automatically uploading them to our S3 storage. This eliminates the need for users to manually download and upload images.

## Implementation

### 1. Image Downloader Utility

**File**: `backend/utils/imageDownloader.js`

Functions:
- `downloadAndUploadImage(imageUrl, folder, filename)` - Download single image and upload to S3
- `downloadAndUploadMultipleImages(images, folder)` - Batch download and upload

Features:
- 30-second timeout for downloads
- Automatic content-type detection
- Filename generation if not provided
- Error handling per image (continues on failure)
- Logging for debugging

### 2. Asset Executor Enhancement

**File**: `backend/services/ai/executors/assetExecutor.js`

Added `createGallery()` method:
- Accepts gallery data with image URLs
- Downloads all images from URLs
- Uploads to S3 in `gallery/` folder
- Creates asset with S3 URLs
- Format: `"Name|URL, Name|URL, ..."`

### 3. AI Service Update

**File**: `backend/services/ai/core/aiService.js`

Added `CREATE_GALLERY` action type:
```javascript
{
  "type": "CREATE_GALLERY",
  "payload": {
    "gallery": {
      "name": "Product Photos",
      "category": "Custom",
      "images": [
        {"name": "Photo 1", "url": "https://images.unsplash.com/photo-..."},
        {"name": "Photo 2", "url": "https://images.unsplash.com/photo-..."}
      ]
    }
  }
}
```

Updated AI prompt to inform that it CAN use free image URLs from Unsplash, Pexels, etc.

### 4. Action Router Update

**File**: `backend/routes/ai.routes.js`

Added handler for `CREATE_GALLERY` action:
```javascript
else if (output.type === 'CREATE_GALLERY') {
    result = await assetExecutor.createGallery(
        shop,
        output.payload.gallery
    );
}
```

## Usage Example

User: "Add 20 images to the Customfly photo gallery using free images or anything that is free"

AI Response:
```json
{
  "type": "CREATE_GALLERY",
  "payload": {
    "gallery": {
      "name": "Customfly Photo",
      "category": "Product",
      "images": [
        {"name": "Modern Design 1", "url": "https://images.unsplash.com/photo-..."},
        {"name": "Modern Design 2", "url": "https://images.unsplash.com/photo-..."},
        ...
      ]
    }
  }
}
```

System:
1. Downloads each image from URL
2. Uploads to S3: `s3://bucket/gallery/1234567890-abc123.jpg`
3. Creates asset with value: `"Modern Design 1|https://s3.../1234567890-abc123.jpg, Modern Design 2|https://s3.../..."`
4. Saves to database

## Benefits

- No manual image download/upload required
- AI can source images from free libraries
- Automatic S3 storage management
- Consistent image format and naming
- Error handling for failed downloads
- Works with any public image URL

## Technical Details

### Dependencies
- `axios` - HTTP client for downloading images
- `@aws-sdk/lib-storage` - S3 multipart upload

### S3 Configuration
- Folder: `gallery/`
- ACL: `public-read`
- Filename format: `{timestamp}-{random}.{ext}`
- Content-Type: Auto-detected from response headers

### Error Handling
- Individual image failures don't stop the process
- Continues with remaining images
- Logs errors for debugging
- Returns only successfully uploaded images

## Files Modified

1. `backend/utils/imageDownloader.js` - NEW: Image download utility
2. `backend/services/ai/executors/assetExecutor.js` - Added createGallery method
3. `backend/services/ai/core/aiService.js` - Added CREATE_GALLERY action type
4. `backend/routes/ai.routes.js` - Added CREATE_GALLERY handler
5. `backend/package.json` - Added axios dependency

## Testing

1. Ask AI: "Create a gallery with 5 product photos from Unsplash"
2. AI generates CREATE_GALLERY action with image URLs
3. Click "Setujui & Jalankan"
4. System downloads and uploads images
5. Gallery asset created with S3 URLs
6. Images visible in AssetDetail page

## Notes

- Works with any public image URL (not just Unsplash)
- Respects 30-second timeout per image
- Generates unique filenames to avoid conflicts
- Maintains original image quality
- CDN transformation applied automatically via transformAssetValue

## Future Enhancements

- Image optimization (resize, compress)
- Support for image search APIs
- Batch size limits
- Progress tracking for large galleries
- Image validation (dimensions, file size)
