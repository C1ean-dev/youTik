const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('./config');
const logger = require('./logger');

class VideoDownloader {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.youtube.apiKey,
    });
    this.lastVideoId = null;
    this.loadLastVideoId();
    this.isMonitoring = false; // Prevent multiple monitoring instances
    this.lastApiCall = 0;
    this.minApiInterval = 1000; // Minimum 1 second between API calls
  }

  loadLastVideoId() {
    const filePath = path.join(__dirname, '..', 'last_video_id.txt');
    if (fs.existsSync(filePath)) {
      this.lastVideoId = fs.readFileSync(filePath, 'utf8').trim();
    }
  }

  saveLastVideoId(videoId) {
    const filePath = path.join(__dirname, '..', 'last_video_id.txt');
    fs.writeFileSync(filePath, videoId);
    this.lastVideoId = videoId;
  }

  async getLatestVideoId() {
    // Rate limiting: ensure minimum interval between API calls
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.minApiInterval) {
      const waitTime = this.minApiInterval - timeSinceLastCall;
      logger.debug(`Rate limiting: waiting ${waitTime}ms before API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      this.lastApiCall = Date.now();

      const response = await this.youtube.search.list({
        part: 'snippet',
        channelId: config.youtube.channelId,
        order: 'date',
        maxResults: 1,
      });

      if (!response.data.items || response.data.items.length === 0) {
        logger.debug('No videos found for channel');
        return null;
      }

      const videoId = response.data.items[0]?.id?.videoId;
      logger.debug(`Latest video ID: ${videoId}`);
      return videoId;
    } catch (error) {
      // Enhance error information
      if (error.response) {
        const status = error.response.status;
        const reason = error.response.data?.error?.errors?.[0]?.reason;

        if (status === 403 && reason === 'quotaExceeded') {
          const quotaError = new Error('YouTube API quota exceeded');
          quotaError.code = 403;
          quotaError.errors = [{ reason: 'quotaExceeded' }];
          throw quotaError;
        }

        if (status === 400 && reason === 'invalid_channel') {
          throw new Error(`Invalid YouTube channel ID: ${config.youtube.channelId}`);
        }
      }

      logger.error('Error fetching latest video ID:', error.message);
      throw error;
    }
  }

  async downloadVideo(videoId, outputPath) {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const stream = ytdl(videoUrl, { quality: 'highest' });
      const writer = fs.createWriteStream(outputPath);

      return new Promise((resolve, reject) => {
        stream.pipe(writer);
        writer.on('finish', () => {
          logger.info(`Video downloaded: ${outputPath}`);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error('Error downloading video:', error);
      throw error;
    }
  }

  async monitorAndDownload() {
    const latestVideoId = await this.getLatestVideoId();
    if (latestVideoId && latestVideoId !== this.lastVideoId) {
      logger.info(`New video detected: ${latestVideoId}`);
      const outputPath = path.join(config.paths.tempDir, `${latestVideoId}.mp4`);
      await this.downloadVideo(latestVideoId, outputPath);
      this.saveLastVideoId(latestVideoId);
      return outputPath;
    }
    return null;
  }

  async processTestVideos() {
    if (!config.development.processTestVideosFirst) return [];

    logger.info('Processing test videos for development...');
    const processedVideos = [];

    for (const videoRef of config.youtube.testVideos) {
      try {
        const videoId = this.extractVideoId(videoRef);
        if (videoId && videoId !== this.lastVideoId) {
          logger.info(`Processing test video: ${videoId}`);
          const outputPath = path.join(config.paths.tempDir, `test_${videoId}.mp4`);
          await this.downloadVideo(videoId, outputPath);
          processedVideos.push(outputPath);
          this.saveLastVideoId(videoId);
        }
      } catch (error) {
        logger.error(`Error processing test video ${videoRef}:`, error);
      }
    }

    return processedVideos;
  }

  extractVideoId(videoRef) {
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = videoRef.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  startMonitoring(intervalMs = 300000) { // 5 minutes
    // Prevent multiple monitoring instances
    if (this.isMonitoring) {
      logger.warn('Monitoring already running, skipping start request');
      return () => {}; // Return empty stop function
    }

    this.isMonitoring = true;
    let consecutiveErrors = 0;
    let lastErrorTime = 0;
    let currentInterval = intervalMs;
    let timeoutId = null;

    logger.info(`Starting YouTube monitoring every ${Math.ceil(intervalMs / 60000)} minutes`);

    const monitor = async () => {
      try {
        const videoPath = await this.monitorAndDownload();
        if (videoPath) {
          logger.info('New video downloaded, starting processing...');
          consecutiveErrors = 0; // Reset error count on success
          currentInterval = intervalMs; // Reset to original interval on success
          // This will be called from main index.js
        } else {
          logger.debug('No new videos found');
        }
      } catch (error) {
        consecutiveErrors++;
        const now = Date.now();

        // Only log quota errors once every 5 minutes to avoid spam
        if (error.code === 403 && error.errors?.[0]?.reason === 'quotaExceeded') {
          if (now - lastErrorTime > 300000) { // 5 minutes
            logger.warn(`YouTube API quota exceeded. Monitoring paused. Next check in ${Math.ceil(currentInterval / 60000)} minutes.`);
            lastErrorTime = now;
          }
        } else {
          // Log other errors immediately
          logger.error('Error in monitoring:', error.message);
        }

        // If too many consecutive errors, increase interval (but don't exceed 1 hour)
        if (consecutiveErrors >= 3) {
          currentInterval = Math.min(currentInterval * 2, 3600000); // Max 1 hour
          logger.warn(`Multiple consecutive errors (${consecutiveErrors}). Increasing check interval to ${Math.ceil(currentInterval / 60000)} minutes.`);
        }

        // For quota exceeded, stop monitoring completely
        if (error.code === 403 && error.errors?.[0]?.reason === 'quotaExceeded') {
          logger.error('Quota exceeded - stopping monitoring to prevent further API calls');
          this.isMonitoring = false;
          return; // Stop the monitoring loop
        }
      }

      // Schedule next check only if still monitoring
      if (this.isMonitoring) {
        timeoutId = setTimeout(monitor, currentInterval);
      }
    };

    // Start monitoring
    timeoutId = setTimeout(monitor, 1000); // Start after 1 second

    // Return a function to stop monitoring
    return () => {
      this.isMonitoring = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        logger.info('Monitoring stopped');
      }
    };
  }
}

module.exports = VideoDownloader;