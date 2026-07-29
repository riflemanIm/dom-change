import { Controller, Get, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
class HealthController {
  @Get()
  @ApiOperation({ summary: 'Проверка доступности API' })
  check() {
    return {
      status: 'ok',
      service: 'domobmen-api',
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
