const axios = require('axios');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

class TikTokUploader {
  constructor() {
    this.baseURL = 'https://open-api.tiktok.com'; // TikTok Open API base URL
    this.accessToken = null; // Will be obtained dynamically
  }

  async getAccessToken() {
    // If no access token, attempt to get one using client credentials
    // Note: TikTok typically requires OAuth flow, this is a placeholder
    try {
      const response = await axios.post(`${this.baseURL}/oauth/access_token/`, {
        client_key: config.tiktok.clientKey,
        client_secret: config.tiktok.clientSecret,
        grant_type: 'client_credentials'
      });
      this.accessToken = response.data.access_token;
      logger.info('Obtained TikTok access token');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get TikTok access token:', {
        status: error.response?.status,
        message: error.message,
        // Never log error.response.data as it may contain tokens
      });
      throw error;
    }
  }

  async uploadVideo(videoPath, title, captions, hashtags = ['#viral', '#tiktok', '#video'], retryCount = 0) {
    const MAX_RETRIES = 3;
    try {
      if (!this.accessToken) {
        await this.getAccessToken();
      }

      logger.info(`Uploading video to TikTok: ${videoPath}`);

      const videoData = fs.readFileSync(videoPath);
      const description = `${title}\n\n${captions.join('\n')}\n\n${hashtags.join(' ')}`;

      // TikTok upload typically requires multiple steps: init, upload chunks, finalize
      // This is a simplified placeholder
      const initResponse = await axios.post(`${this.baseURL}/video/upload/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: title,
          description: description,
          // Video data would be uploaded in chunks
        }
      });

      logger.info('Video uploaded to TikTok successfully');
      return initResponse.data;
    } catch (error) {
      logger.error('Error uploading to TikTok:', error.response?.data || error.message);
      // If token expired, try to refresh
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        this.accessToken = null;
        return this.uploadVideo(videoPath, title, captions, hashtags, retryCount + 1);
      }
      throw error;
    }
  }
}

module.exports = TikTokUploader;