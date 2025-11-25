const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

class GeminiProGenerator {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }

  async generateTitleAndCaptions(videoPath) {
    try {
      logger.info(`Generating title and captions for: ${videoPath}`);

      const stats = await fs.promises.stat(videoPath);
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${stats.size} bytes`);
      }

      const videoData = await fs.promises.readFile(videoPath);
      const prompt = `Gere um título viral e legendas criativas para este clipe de vídeo, focando em engajamento no TikTok. Forneça o título em uma linha e as legendas como uma lista de frases curtas.`;

      const response = await this.ai.models.generateContent({
        model: config.gemini.models.pro,
        contents: [
          config.gemini.prompts.titleAndCaptions,
          {
            inlineData: {
              mimeType: 'video/mp4',
              data: videoData.toString('base64'),
            },
          },
        ],
      });

      const text = response.text();

      // Parse title and captions
      const { title, captions } = this.parseTitleAndCaptions(text);
      logger.info(`Generated title: ${title}, captions: ${captions.length}`);
      return { title, captions };
    } catch (error) {
      logger.error('Error generating title and captions with Gemini Pro:', error);
      throw error;
    }
  }

  parseTitleAndCaptions(text) {
    const lines = text.split('\n');
    let title = '';
    const captions = [];

    for (const line of lines) {
      if (line.startsWith('Título:') || line.startsWith('Title:')) {
        title = line.replace(/^(Título|Title):\s*/, '').trim();
      } else if (line.startsWith('-') || line.match(/^\d+\./)) {
        captions.push(line.replace(/^[-•\d+\.\s]*/, '').trim());
      }
    }

    return { title, captions };
  }
}

module.exports = GeminiProGenerator;