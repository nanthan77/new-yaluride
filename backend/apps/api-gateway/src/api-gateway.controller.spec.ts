import { Test, TestingModule } from '@nestjs/testing';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { SERVICE_NAMES } from './api-gateway.module';
import { JwtAuthGuard, RolesGuard } from '@yaluride/auth';
import { ThrottlerGuard } from '@nestjs/throttler';

const createMockClientProxy = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
  emit: jest.fn(),
});

describe('ApiGatewayController', () => {
  let controller: ApiGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiGatewayController],
      providers: [
        ApiGatewayService,
        { provide: SERVICE_NAMES.USER_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.DRIVER_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.RIDE_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.PAYMENT_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.LOCATION_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.VOICE_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.ADMIN_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.ANALYTICS_SERVICE, useFactory: createMockClientProxy },
        { provide: SERVICE_NAMES.NOTIFICATION_SERVICE, useFactory: createMockClientProxy },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ApiGatewayController>(ApiGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
