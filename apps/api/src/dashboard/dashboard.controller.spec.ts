import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: any;

  const mockDashboardService = {
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = mockDashboardService;
  });

  describe('getSummary', () => {
    it('should call service.getSummary with userId from req', async () => {
      const req = { user: { id: 1 } };
      const expected = {
        totalBalance: 10000,
        monthlyIncome: 5000,
        monthlyExpenses: 2000,
        recentTransactions: [],
        budgetStatus: [],
      };
      dashboardService.getSummary.mockResolvedValue(expected);

      const result = await controller.getSummary(req);
      expect(dashboardService.getSummary).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });

    it('should call service.getSummary without userId when req.user is undefined', async () => {
      const req = {};
      dashboardService.getSummary.mockResolvedValue({});

      await controller.getSummary(req);
      expect(dashboardService.getSummary).toHaveBeenCalledWith(undefined);
    });
  });
});
