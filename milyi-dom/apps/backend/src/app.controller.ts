import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['', 'api'])
  getRoot() {
    return {
      message: 'Milyi Dom API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['health', 'api/health'])
  getHealth() {
    return this.appService.getHealth();
  }

  @Get(['stats', 'api/stats'])
  getStats() {
    return this.appService.getStats();
  }

  @Get(['cities', 'api/cities'])
  getPopularCities() {
    return this.appService.getPopularCities();
  }
}
