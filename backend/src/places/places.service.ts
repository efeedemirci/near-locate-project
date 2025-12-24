import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place } from './entities/place.entity';
import { CreatePlaceDto } from './dto/create-place.dto';
import { Point } from 'geojson';
import * as path from 'path';

// Shapefile Kütüphanesi
// eslint-disable-next-line @typescript-eslint/no-var-requires
const shapefile = require('shapefile');

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
  ) {}

  // =========================================================
  // 1. TEMEL İŞLEMLER
  // =========================================================

  async create(createPlaceDto: CreatePlaceDto) {
    const location: Point = {
      type: 'Point',
      coordinates: [createPlaceDto.longitude, createPlaceDto.latitude],
    };

    const newPlace = this.placeRepository.create({
      name: createPlaceDto.name,
      category: createPlaceDto.category,
      location: location,
    });

    return await this.placeRepository.save(newPlace);
  }

  async findNearest(lat: number, lon: number, category?: string) {
    let queryBuilder = this.placeRepository
      .createQueryBuilder('place')
      .select('place.name', 'name')
      .addSelect('place.category', 'category')
      .addSelect(`ST_Distance(place.location::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)`, 'distance')
      .addSelect('ST_Y(place.location::geometry)', 'latitude')
      .addSelect('ST_X(place.location::geometry)', 'longitude')
      .setParameters({ lat, lon });

    if (category) {
      queryBuilder = queryBuilder.andWhere('place.category = :category', { category });
    }

    queryBuilder = queryBuilder.andWhere(
      `ST_DWithin(place.location::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 50000)`
    );

    return await queryBuilder.orderBy('distance', 'ASC').limit(50).getRawMany();
  }

  // =========================================================
  // 2. YÖNETİM (IMPORT & TEMİZLİK)
  // =========================================================

  async clearDatabase() {
    this.logger.warn('☢️ Temizlik Başladı...');
    await this.placeRepository.query('TRUNCATE TABLE place RESTART IDENTITY');
    return { message: 'Veritabanı temizlendi.' };
  }

  async importFilteredShapefile() {
    this.logger.log('🚀 AKILLI İMPORT BAŞLADI (UTF-8 Native Mod)...');

    const targets = [
        { name: 'Kastamonu', lat: 41.3766, lon: 33.7765, radiusKm: 15 },
        { name: 'Ankara', lat: 39.9208, lon: 32.8541, radiusKm: 40 }
    ];

    const targetCategories = [
        'cafe', 'restaurant', 'pharmacy', 'hospital', 'bank', 
        'fast_food', 'atm', 'park', 'doctors', 'clinic', 
        'university', 'school', 'mall', 'supermarket', 'bakery', 'library'
    ];

    const files = ['gis_osm_pois_free_1.shp', 'gis_osm_pois_a_free_1.shp'];
    
    let totalSaved = 0;
    let totalSkipped = 0;

    for (const fileName of files) {
      const filePath = path.join(process.cwd(), fileName);
      this.logger.log(`📂 Dosya Okunuyor: ${fileName}`);
      
      let batch: Place[] = [];
      
      try {
        // ÇÖZÜM BURADA: Dosyayı doğrudan UTF-8 olarak açıyoruz.
        // Artık manuel düzeltmeye gerek yok.
        const source = await shapefile.open(filePath, undefined, { encoding: 'utf-8' });
        
        let result;
        while (!(result = await source.read()).done) {
          const feature = result.value;
          const props = feature.properties; 
          
          const category = props.fclass;
          const name = props.name; // Direkt alıyoruz

          if (!name || !category || !targetCategories.includes(category)) {
              continue;
          }

          let lon, lat;
          if (feature.geometry.type === 'Point') {
            lon = feature.geometry.coordinates[0];
            lat = feature.geometry.coordinates[1];
          } else if (feature.geometry.type === 'Polygon') {
            lon = feature.geometry.coordinates[0][0][0];
            lat = feature.geometry.coordinates[0][0][1];
          } else if (feature.geometry.type === 'MultiPolygon') {
             lon = feature.geometry.coordinates[0][0][0][0];
             lat = feature.geometry.coordinates[0][0][0][1];
          } else {
            continue;
          }

          let isInsideTarget = false;
          for (const target of targets) {
              const dist = this.getDistanceFromLatLonInKm(lat, lon, target.lat, target.lon);
              if (dist <= target.radiusKm) {
                  isInsideTarget = true;
                  break;
              }
          }

          if (!isInsideTarget) {
              totalSkipped++;
              continue;
          }

          const newPlace = new Place();
          newPlace.name = name; // Düzeltme fonksiyonu yok, olduğu gibi al
          newPlace.category = category;
          newPlace.location = {
            type: 'Point',
            coordinates: [lon, lat],
          };

          batch.push(newPlace);
          totalSaved++;

          if (batch.length >= 2000) {
            await this.placeRepository.save([...batch]);
            batch = [];
            this.logger.log(`   💾 ${totalSaved} kayıt eklendi...`);
          }
        }
        
        if (batch.length > 0) {
          await this.placeRepository.save(batch);
        }

      } catch (error) {
        this.logger.error(`Hata (${fileName}): ${error.message}`);
      }
    }

    this.logger.log(`🏁 İŞLEM TAMAMLANDI!`);
    this.logger.log(`✅ Kaydedilen: ${totalSaved}`);
    this.logger.log(`🗑️ Elenen: ${totalSkipped}`);
    
    return { message: `İşlem bitti. ${totalSaved} mekan kaydedildi.` };
  }

  // =========================================================
  // 3. YARDIMCI METODLAR
  // =========================================================

  private getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  }

  private deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
}