import { Test, TestingModule } from '@nestjs/testing';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

describe('SeedController', () => {
  let controller: SeedController;
  let seedService: any;

  const mockSeedService = {
    seed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [
        {
          provide: SeedService,
          useValue: mockSeedService,
        },
      ],
    }).compile();

    controller = module.get<SeedController>(SeedController);
    seedService = mockSeedService;
  });

  describe('seed', () => {
    it('should call seedService.seed and return result', async () => {
      const expected = {
        message: 'Demo data seeded successfully',
        user: { email: 'demo@example.com', name: 'Demo User' },
        categories: 6,
        accounts: 3,
        transactions: 20,
        budgets: 4,
      };
      seedService.seed.mockResolvedValue(expected);

      const result = await controller.seed();
      expect(seedService.seed).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should propagate service errors', async () => {
      seedService.seed.mockRejectedValue(new Error('Already seeded'));
      await expect(controller.seed()).rejects.toThrow('Already seeded');
    });
  });
});
