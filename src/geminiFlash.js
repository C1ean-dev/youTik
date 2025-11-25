const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

class GeminiFlashAnalyzer {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }

  async analyzeVideoForCuts(videoPath) {
    try {
      logger.info(`Analyzing video for cuts: ${videoPath}`);

      const videoData = fs.readFileSync(videoPath);
      const prompt = `Analise este vídeo e sugira cortes de 15-30 segundos com momentos de alto engajamento, como picos de ação ou humor. Forneça timestamps exatos (início e fim) para cada sugestão de corte.`;

      const response = await this.ai.models.generateContent({
        model: config.gemini.models.flash,
        contents: [
          config.gemini.prompts.cutAnalysis,
          {
            inlineData: {
              mimeType: 'video/mp4',
              data: videoData.toString('base64'),
            },
          },
        ],
      });

      const text = response.text();

      // Parse the response to extract timestamps
      const suggestions = this.parseCutSuggestions(text);
      logger.info(`Cut suggestions: ${suggestions.length}`);
      return suggestions;
    } catch (error) {
      logger.error('Error analyzing video with Gemini Flash:', error);
      throw error;
    }
  }

  parseCutSuggestions(text) {
    // Simple parsing, assuming format like "0:15-0:30", "1:20-1:45"
    const regex = /(\d+):(\d+)-(\d+):(\d+)/g;
    const suggestions = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = parseInt(match[1]) * 60 + parseInt(match[2]);
      const end = parseInt(match[3]) * 60 + parseInt(match[4]);
      suggestions.push({ start, end });
    }
    return suggestions;
  }
}

module.exports = GeminiFlashAnalyzer;