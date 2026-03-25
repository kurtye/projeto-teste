import { Test, TestingModule } from '@nestjs/testing';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  let provider: ClientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientesService],
    }).compile();

    provider = module.get<ClientesService>(ClientesService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
