import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  create(@Body() createPlaceDto: CreatePlaceDto) {
    return this.placesService.create(createPlaceDto);
  }

  // TEMİZLİK
  @Get('clear')
  clearAll() {
    return this.placesService.clearDatabase();
  }

  @Get('seed/turkey')
  importFiltered() {
    return this.placesService.importFilteredShapefile();
  }

  @Get('search')
  async search(@Query('lat') lat: string, @Query('lon') lon: string, @Query('category') category: string) {
    return this.placesService.findNearest(parseFloat(lat), parseFloat(lon), category);
  }
}