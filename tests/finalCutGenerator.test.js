const FinalCutGenerator = require('../src/finalCutGenerator');

jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static');
jest.mock('../src/logger');

describe('FinalCutGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new FinalCutGenerator();
  });

  test('should generate final cut', async () => {
    const mockFfmpeg = {
      input: jest.fn().mockReturnThis(),
      inputOptions: jest.fn().mockReturnThis(),
      videoFilters: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'end') cb();
        return mockFfmpeg;
      }),
      run: jest.fn()
    };

    require('fluent-ffmpeg').mockReturnValue(mockFfmpeg);

    const result = await generator.generateFinalCut(['clip1.mp4', 'clip2.mp4'], 'final.mp4', 'Title', ['Caption 1']);
    expect(result).toBe('final.mp4');
  });
});