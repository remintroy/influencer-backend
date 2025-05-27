import { Test, TestingModule } from '@nestjs/testing';
import { FlashDealService } from './flash-deal.service';

describe('FlashDealService', () => {
  let service: FlashDealService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlashDealService],
    }).compile();

    service = module.get<FlashDealService>(FlashDealService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
