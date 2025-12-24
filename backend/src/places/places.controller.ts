import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  // YENİ YER EKLEME
  @Post()
  create(@Body() createPlaceDto: CreatePlaceDto) {
    return this.placesService.create(createPlaceDto);
  }

  // TEMİZLİK
  @Get('clear')
  clearAll() {
    return this.placesService.clearDatabase();
  }

  // İŞTE DÜZELTME BURADA:
  // Artık 'seedTargetCities' yok. 'importFilteredShapefile' çağırıyoruz.
  @Get('seed/turkey')
  importFiltered() {
    return this.placesService.importFilteredShapefile();
  }

  // ARAMA
  @Get('search')
  async search(@Query('lat') lat: string, @Query('lon') lon: string, @Query('category') category: string) {
    return this.placesService.findNearest(parseFloat(lat), parseFloat(lon), category);
  }
}