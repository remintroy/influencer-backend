import { Test, TestingModule } from '@nestjs/testing';
import { FlashDealController } from './flash-deal.controller';

describe('FlashDealController', () => {
  let controller: FlashDealController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashDealController],
    }).compile();

    controller = module.get<FlashDealController>(FlashDealController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
