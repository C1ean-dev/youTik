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
    this.lastVideoIds = {}; // Map of channelId to last video ID
    this.loadLastVideoIds();
    this.isMonitoring = false; // Prevent multiple monitoring instances
    this.lastApiCall = 0;
    this.minApiInterval = config.youtube.minApiIntervalMs; // Minimum interval between API calls
  }

  loadLastVideoIds() {
    const filePath = path.join(__dirname, '..', 'last_video_ids.json');
    if (fs.existsSync(filePath)) {
      try {
        this.lastVideoIds = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        logger.warn('Error loading last video IDs, starting fresh:', error.message);
        this.lastVideoIds = {};
      }
    }
  }

  saveLastVideoIds() {
    const filePath = path.join(__dirname, '..', 'last_video_ids.json');
    fs.writeFileSync(filePath, JSON.stringify(this.lastVideoIds, null, 2));
  }

  getLastVideoId(channelId) {
    return this.lastVideoIds[channelId] || null;
  }

  setLastVideoId(channelId, videoId) {
    this.lastVideoIds[channelId] = videoId;
    this.saveLastVideoIds();
  }

  async getLatestVideoId(channelId) {
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
        channelId: channelId,
        order: 'date',
        maxResults: 1,
      });

      if (!response.data.items || response.data.items.length === 0) {
        logger.debug(`No videos found for channel ${channelId}`);
        return null;
      }

      const videoId = response.data.items[0]?.id?.videoId;
      logger.debug(`Latest video ID for channel ${channelId}: ${videoId}`);
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
          throw new Error(`Invalid YouTube channel ID: ${channelId}`);
        }
      }

      logger.error(`Error fetching latest video ID for channel ${channelId}:`, error.message);
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

  async monitorAndDownloadForChannel(channelId) {
    const latestVideoId = await this.getLatestVideoId(channelId);
    const lastVideoId = this.getLastVideoId(channelId);

    if (latestVideoId && latestVideoId !== lastVideoId) {
      logger.info(`New video detected for channel ${channelId}: ${latestVideoId}`);
      const outputPath = path.join(config.paths.tempDir, `${channelId}_${latestVideoId}.mp4`);
      await this.downloadVideo(latestVideoId, outputPath);
      this.setLastVideoId(channelId, latestVideoId);
      return { outputPath, channelId, videoId: latestVideoId };
    }
    return null;
  }

  async monitorAndDownload() {
    const results = [];

    // Monitor main channel if configured
    if (config.youtube.channelId) {
      try {
        const result = await this.monitorAndDownloadForChannel(config.youtube.channelId);
        if (result) results.push(result);
      } catch (error) {
        logger.error(`Error monitoring main channel ${config.youtube.channelId}:`, error.message);
      }
    }

    // Monitor additional channels
    for (const channelRef of config.youtube.channels) {
      try {
        const channelId = await this.resolveChannelId(channelRef);
        const result = await this.monitorAndDownloadForChannel(channelId);
        if (result) results.push(result);
      } catch (error) {
        logger.error(`Error monitoring channel ${channelRef}:`, error.message);
      }
    }

    return results.length > 0 ? results : null;
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

  extractChannelHandle(channelRef) {
    // Handle different channel reference formats
    if (channelRef.startsWith('@')) {
      return channelRef.substring(1); // Remove @
    }

    // Extract from URL
    const urlPattern = /youtube\.com\/@([a-zA-Z0-9_-]+)/;
    const match = channelRef.match(urlPattern);
    if (match) return match[1];

    // If it's already a handle without @
    if (/^[a-zA-Z0-9_-]+$/.test(channelRef)) {
      return channelRef;
    }

    return null;
  }

  async resolveChannelId(channelRef) {
    // If it's already a channel ID (starts with UC and 24 chars)
    if (/^UC[a-zA-Z0-9_-]{22}$/.test(channelRef)) {
      return channelRef;
    }

    const handle = this.extractChannelHandle(channelRef);
    if (!handle) {
      throw new Error(`Invalid channel reference: ${channelRef}`);
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.minApiInterval) {
      const waitTime = this.minApiInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      this.lastApiCall = Date.now();

      const response = await this.youtube.search.list({
        part: 'snippet',
        q: `@${handle}`,
        type: 'channel',
        maxResults: 1,
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Channel not found: @${handle}`);
      }

      const channelId = response.data.items[0]?.snippet?.channelId;
      if (!channelId) {
        throw new Error(`Could not resolve channel ID for @${handle}`);
      }

      logger.debug(`Resolved @${handle} to channel ID: ${channelId}`);
      return channelId;
    } catch (error) {
      logger.error(`Error resolving channel ${channelRef}:`, error.message);
      throw error;
    }
  }

  startMonitoring(intervalMs = null, onNewVideos = null) {
    // Use config default if not specified
    if (intervalMs === null) {
      intervalMs = config.youtube.monitoringIntervalMinutes * 60 * 1000;
    }

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
        const results = await this.monitorAndDownload();
        if (results && results.length > 0) {
          logger.info(`${results.length} new video(s) downloaded, starting processing...`);
          consecutiveErrors = 0; // Reset error count on success
          currentInterval = intervalMs; // Reset to original interval on success

          // Call the callback with the results
          if (onNewVideos) {
            onNewVideos(results);
          }
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

        // If too many consecutive errors, increase interval
        if (consecutiveErrors >= config.youtube.consecutiveErrorsThreshold) {
          currentInterval = Math.min(currentInterval * 2, config.youtube.maxMonitoringIntervalMinutes * 60 * 1000);
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