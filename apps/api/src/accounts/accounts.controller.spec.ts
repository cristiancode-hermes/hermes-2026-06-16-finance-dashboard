import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

describe('AccountsController', () => {
  let controller: AccountsController;
  let accountsService: any;

  const mockAccountsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: mockAccountsService,
        },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    accountsService = mockAccountsService;
  });

  describe('findAll', () => {
    it('should call service.findAll with userId from req', async () => {
      const req = { user: { id: 1 } };
      const expected = [{ id: 1, name: 'Checking' }];
      accountsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(req);
      expect(accountsService.findAll).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });

    it('should call service.findAll without userId when req.user is undefined', async () => {
      const req = {};
      accountsService.findAll.mockResolvedValue([]);

      await controller.findAll(req);
      expect(accountsService.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const expected = { id: 1, name: 'Checking' };
      accountsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(1);
      expect(accountsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and userId', async () => {
      const dto: CreateAccountDto = { name: 'New', type: 'checking', balance: 100 };
      const req = { user: { id: 1 } };
      const expected = { id: 2, name: 'New', type: 'checking', balance: 100 };
      accountsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, req);
      expect(accountsService.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and userId', async () => {
      const dto: CreateAccountDto = { name: 'Updated', type: 'savings' };
      const req = { user: { id: 1 } };
      const expected = { id: 1, name: 'Updated', type: 'savings' };
      accountsService.update.mockResolvedValue(expected);

      const result = await controller.update(1, dto, req);
      expect(accountsService.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      accountsService.remove.mockResolvedValue(undefined);
      await controller.remove(1);
      expect(accountsService.remove).toHaveBeenCalledWith(1);
    });
  });
});
