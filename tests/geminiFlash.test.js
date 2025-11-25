const GeminiFlashAnalyzer = require('../src/geminiFlash');

jest.mock('@google/genai');
jest.mock('fs');
jest.mock('../src/logger');

describe('GeminiFlashAnalyzer', () => {
  let analyzer;
  let mockModel;

  beforeEach(() => {
    const mockAI = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: () => '0:15-0:30\n1:20-1:45'
        })
      }
    };

    require('@google/genai').GoogleGenAI.mockReturnValue(mockAI);
    require('fs').readFileSync.mockReturnValue(Buffer.from('mock video data'));
    analyzer = new GeminiFlashAnalyzer();
  });

  test('should analyze video for cuts', async () => {
    const mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => '0:15-0:30\n1:20-1:45'
        }
      })
    };

    const mockAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    };

    require('@google/genai').GoogleGenAI.mockReturnValue(mockAI);

    const suggestions = await analyzer.analyzeVideoForCuts('video.mp4');
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toEqual({ start: 15, end: 30 });
  });

  test('should parse cut suggestions', () => {
    const text = 'Suggested cuts: 0:15-0:30 and 1:20-1:45';
    const suggestions = analyzer.parseCutSuggestions(text);
    expect(suggestions).toHaveLength(2);
  });
});