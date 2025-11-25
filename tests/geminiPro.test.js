const GeminiProGenerator = require('../src/geminiPro');

jest.mock('@google/genai');
jest.mock('fs');
jest.mock('../src/logger');

describe('GeminiProGenerator', () => {
  let generator;
  let mockModel;

  beforeEach(() => {
    const mockAI = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: () => 'Título: Vídeo Incrível\n- Legenda 1\n- Legenda 2'
        })
      }
    };

    require('@google/genai').GoogleGenAI.mockReturnValue(mockAI);
    require('fs').readFileSync.mockReturnValue(Buffer.from('mock video data'));
    generator = new GeminiProGenerator();
  });

  test('should generate title and captions', async () => {
    const mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Título: Vídeo Incrível\n- Legenda 1\n- Legenda 2'
        }
      })
    };

    const mockAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    };

    require('@google/genai').GoogleGenAI.mockReturnValue(mockAI);

    const result = await generator.generateTitleAndCaptions('video.mp4');
    expect(result.title).toBe('Vídeo Incrível');
    expect(result.captions).toHaveLength(2);
  });
});