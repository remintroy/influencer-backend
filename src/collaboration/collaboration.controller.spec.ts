import { Test, TestingModule } from '@nestjs/testing';
import { CollaborationController } from './collaboration.controller';

describe('CollaborationController', () => {
  let controller: CollaborationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaborationController],
    }).compile();

    controller = module.get<CollaborationController>(CollaborationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
