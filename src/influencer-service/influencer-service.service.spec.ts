import { Test, TestingModule } from '@nestjs/testing';
import { InfluencerServiceService } from './influencer-service.service';

describe('InfluencerServiceService', () => {
  let service: InfluencerServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InfluencerServiceService],
    }).compile();

    service = module.get<InfluencerServiceService>(InfluencerServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
