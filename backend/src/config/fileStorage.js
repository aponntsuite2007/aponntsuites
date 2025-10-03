const AWS = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * File Storage Configuration
 * Supports both S3/CDN and local storage with optimization
 */

class FileStorage {
  constructor() {
    this.s3Client = null;
    this.useS3 = false;
    this.bucketName = process.env.S3_BUCKET_NAME;
    this.cdnUrl = process.env.CDN_URL;
    this.localStoragePath = path.join(__dirname, '../../uploads');
    this.initializeStorage();
  }

  async initializeStorage() {
    // Try to initialize S3
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && this.bucketName) {
      try {
        this.s3Client = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        });

        // Test S3 connection
        await this.s3Client.headBucket({ Bucket: this.bucketName }).promise();
        this.useS3 = true;
        console.log('✅ S3 storage initialized');
      } catch (error) {
        console.warn('⚠️ S3 not available, using local storage:', error.message);
      }
    } else {
      console.log('💾 Using local file storage');
    }

    // Ensure local storage directory exists
    try {
      await fs.mkdir(this.localStoragePath, { recursive: true });
      await fs.mkdir(path.join(this.localStoragePath, 'photos'), { recursive: true });
      await fs.mkdir(path.join(this.localStoragePath, 'documents'), { recursive: true });
      await fs.mkdir(path.join(this.localStoragePath, 'thumbnails'), { recursive: true });
    } catch (error) {
      console.error('Error creating storage directories:', error);
    }
  }

  /**
   * Get multer configuration for file uploads
   */
  getMulterConfig(options = {}) {
    const {
      fileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxSize = 10 * 1024 * 1024, // 10MB default
      destination = 'general'
    } = options;

    const storage = multer.memoryStorage();

    return multer({
      storage: storage,
      limits: {
        fileSize: maxSize
      },
      fileFilter: (req, file, cb) => {
        if (fileTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed. Supported types: ${fileTypes.join(', ')}`));
        }
      }
    });
  }

  /**
   * Upload file to storage (S3 or local)
   */
  async uploadFile(file, options = {}) {
    const {
      folder = 'general',
      companySlug,
      optimize = false,
      generateThumbnail = false
    } = options;

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = path.extname(file.originalname);
      const fileName = `${timestamp}_${randomString}${extension}`;
      const filePath = companySlug ? `${companySlug}/${folder}/${fileName}` : `${folder}/${fileName}`;

      let processedBuffer = file.buffer;
      let fileSize = file.size;

      // Image optimization if requested
      if (optimize && file.mimetype.startsWith('image/')) {
        const optimized = await this.optimizeImage(file.buffer, {
          quality: 85,
          maxWidth: 1920,
          maxHeight: 1080
        });
        processedBuffer = optimized.buffer;
        fileSize = optimized.buffer.length;
      }

      let fileUrl;

      if (this.useS3) {
        // Upload to S3
        const uploadParams = {
          Bucket: this.bucketName,
          Key: filePath,
          Body: processedBuffer,
          ContentType: file.mimetype,
          CacheControl: 'max-age=31536000', // 1 year cache
          Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            companySlug: companySlug || 'global'
          }
        };

        const result = await this.s3Client.upload(uploadParams).promise();
        fileUrl = this.cdnUrl ? `${this.cdnUrl}/${filePath}` : result.Location;
      } else {
        // Save locally
        const localPath = path.join(this.localStoragePath, filePath);
        const localDir = path.dirname(localPath);
        
        await fs.mkdir(localDir, { recursive: true });
        await fs.writeFile(localPath, processedBuffer);
        
        fileUrl = `/uploads/${filePath}`;
      }

      // Generate thumbnail if requested
      let thumbnailUrl = null;
      if (generateThumbnail && file.mimetype.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(file.buffer, filePath, companySlug);
      }

      return {
        success: true,
        url: fileUrl,
        thumbnailUrl: thumbnailUrl,
        fileName: fileName,
        originalName: file.originalname,
        filePath: filePath,
        fileSize: fileSize,
        mimeType: file.mimetype,
        storage: this.useS3 ? 's3' : 'local'
      };

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Optimize image using Sharp
   */
  async optimizeImage(buffer, options = {}) {
    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options;

    try {
      const optimized = await sharp(buffer)
        .resize(maxWidth, maxHeight, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: quality,
          progressive: true 
        })
        .toBuffer();

      return {
        buffer: optimized,
        size: optimized.length
      };
    } catch (error) {
      console.error('Image optimization error:', error);
      return {
        buffer: buffer,
        size: buffer.length
      };
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(buffer, originalPath, companySlug) {
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center' 
        })
        .jpeg({ 
          quality: 75 
        })
        .toBuffer();

      // Generate thumbnail path
      const parsedPath = path.parse(originalPath);
      const thumbnailPath = path.join(parsedPath.dir, 'thumbnails', `thumb_${parsedPath.name}.jpg`);

      if (this.useS3) {
        // Upload thumbnail to S3
        const uploadParams = {
          Bucket: this.bucketName,
          Key: thumbnailPath,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=31536000'
        };

        const result = await this.s3Client.upload(uploadParams).promise();
        return this.cdnUrl ? `${this.cdnUrl}/${thumbnailPath}` : result.Location;
      } else {
        // Save thumbnail locally
        const localThumbnailPath = path.join(this.localStoragePath, thumbnailPath);
        const localThumbnailDir = path.dirname(localThumbnailPath);
        
        await fs.mkdir(localThumbnailDir, { recursive: true });
        await fs.writeFile(localThumbnailPath, thumbnailBuffer);
        
        return `/uploads/${thumbnailPath}`;
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return null;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath) {
    try {
      if (this.useS3) {
        await this.s3Client.deleteObject({
          Bucket: this.bucketName,
          Key: filePath
        }).promise();
      } else {
        const localPath = path.join(this.localStoragePath, filePath);
        await fs.unlink(localPath);
      }
      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  /**
   * Get signed URL for temporary access (S3 only)
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    if (!this.useS3) {
      return `/uploads/${filePath}`;
    }

    try {
      const url = await this.s3Client.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: filePath,
        Expires: expiresIn
      });
      return url;
    } catch (error) {
      console.error('Signed URL error:', error);
      return null;
    }
  }

  /**
   * Compress and convert image to WebP for better performance
   */
  async convertToWebP(buffer, quality = 80) {
    try {
      const webpBuffer = await sharp(buffer)
        .webp({ quality: quality })
        .toBuffer();

      return webpBuffer;
    } catch (error) {
      console.error('WebP conversion error:', error);
      return buffer;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(companySlug = null) {
    try {
      if (this.useS3) {
        // Get S3 statistics
        const prefix = companySlug ? `${companySlug}/` : '';
        const objects = await this.s3Client.listObjectsV2({
          Bucket: this.bucketName,
          Prefix: prefix
        }).promise();

        const totalSize = objects.Contents.reduce((sum, obj) => sum + obj.Size, 0);
        
        return {
          totalFiles: objects.Contents.length,
          totalSize: totalSize,
          averageSize: objects.Contents.length > 0 ? Math.round(totalSize / objects.Contents.length) : 0,
          storage: 's3'
        };
      } else {
        // Get local storage statistics
        const basePath = companySlug 
          ? path.join(this.localStoragePath, companySlug)
          : this.localStoragePath;

        const stats = await this.getDirectoryStats(basePath);
        return {
          totalFiles: stats.fileCount,
          totalSize: stats.totalSize,
          averageSize: stats.fileCount > 0 ? Math.round(stats.totalSize / stats.fileCount) : 0,
          storage: 'local'
        };
      }
    } catch (error) {
      console.error('File stats error:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        storage: this.useS3 ? 's3' : 'local',
        error: error.message
      };
    }
  }

  async getDirectoryStats(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let fileCount = 0;
      let totalSize = 0;

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subStats = await this.getDirectoryStats(fullPath);
          fileCount += subStats.fileCount;
          totalSize += subStats.totalSize;
        } else {
          const stat = await fs.stat(fullPath);
          fileCount++;
          totalSize += stat.size;
        }
      }

      return { fileCount, totalSize };
    } catch (error) {
      return { fileCount: 0, totalSize: 0 };
    }
  }
}

// Export singleton instance
const fileStorage = new FileStorage();

module.exports = {
  FileStorage,
  fileStorage
};