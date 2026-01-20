import { ListingStatus } from '@prisma/client';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post('search')
  search(@Body() searchDto: SearchListingsDto) {
    return this.listingsService.searchListings(searchDto);
  }

  @Get('search')
  searchGet(@Query() searchDto: SearchListingsDto) {
    return this.listingsService.searchListings(searchDto);
  }

  @Get('featured')
  getFeatured() {
    return this.listingsService.getFeaturedListings();
  }

  @Get()
  findAll() {
    return this.listingsService.findAll();
  }

  @Get('host/me')
  @UseGuards(JwtAuthGuard)
  findHostListings(@CurrentUser() user: CurrentUserType) {
    return this.listingsService.getHostListings(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.listingsService.findBySlug(slug);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.listingsService.getListingStats(id);
  }

  @Post(':id/availability')
  checkAvailability(
    @Param('id') id: string,
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.listingsService.checkAvailability(id, checkAvailabilityDto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserType,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingsService.create(user.id, createListingDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, user.id, updateListingDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body('status', new ParseEnumPipe(ListingStatus)) status: ListingStatus,
  ) {
    return this.listingsService.updateStatus(id, user.id, status);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description?: string,
    @Body('isPrimary') isPrimary?: string,
    @Body('position') position?: string,
  ) {
    const normalizedIsPrimary =
      isPrimary !== undefined ? String(isPrimary).toLowerCase() : undefined;
    const parsedIsPrimary =
      normalizedIsPrimary !== undefined
        ? ['true', '1', 'on'].includes(normalizedIsPrimary)
        : undefined;
    const parsedPosition =
      position !== undefined && position !== '' ? Number(position) : undefined;

    if (parsedPosition !== undefined && Number.isNaN(parsedPosition)) {
      throw new BadRequestException('position must be a number');
    }

    return this.listingsService.addListingImageFromUpload(id, user.id, file, {
      description,
      isPrimary: parsedIsPrimary,
      position: parsedPosition,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.listingsService.remove(id, user.id);
  }
}
