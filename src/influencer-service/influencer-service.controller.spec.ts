import { Test, TestingModule } from '@nestjs/testing';
import { InfluencerServiceController } from './influencer-service.controller';

describe('InfluencerServiceController', () => {
  let controller: InfluencerServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InfluencerServiceController],
    }).compile();

    controller = module.get<InfluencerServiceController>(InfluencerServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
