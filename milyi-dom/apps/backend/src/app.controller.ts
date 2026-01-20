import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      message: 'Milyi Dom API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('stats')
  getStats() {
    return this.appService.getStats();
  }

  @Get('cities')
  getPopularCities() {
    return this.appService.getPopularCities();
  }
}
