const ResolutionReducer = require('../src/resolutionReducer');

jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static');
jest.mock('../src/logger');

describe('ResolutionReducer', () => {
  let reducer;

  beforeEach(() => {
    reducer = new ResolutionReducer();
  });

  test('should reduce resolution', async () => {
    const mockFfmpeg = {
      videoFilters: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'end') cb();
        return mockFfmpeg;
      }),
      run: jest.fn()
    };

    require('fluent-ffmpeg').mockReturnValue(mockFfmpeg);

    const result = await reducer.reduceResolution('input.mp4', 'output.mp4', '854x480');
    expect(result).toBe('output.mp4');
  });
});