const VideoAccelerator = require('../src/accelerator');

jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static');
jest.mock('../src/logger');

describe('VideoAccelerator', () => {
  let accelerator;

  beforeEach(() => {
    accelerator = new VideoAccelerator();
  });

  test('should accelerate video', async () => {
    const mockFfmpeg = {
      videoFilters: jest.fn().mockReturnThis(),
      audioFilters: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'end') cb();
        return mockFfmpeg;
      }),
      run: jest.fn()
    };

    require('fluent-ffmpeg').mockReturnValue(mockFfmpeg);

    const result = await accelerator.accelerateVideo('input.mp4', 'output.mp4', 2.0);
    expect(result).toBe('output.mp4');
  });
});