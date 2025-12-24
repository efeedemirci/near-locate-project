import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static'; // <-- 1. IMPORT ET
import { join } from 'path'; // <-- 2. IMPORT ET
import { PlacesModule } from './places/places.module';
import { Place } from './places/entities/place.entity';

@Module({
  imports: [
    // 3. BU KISMI EKLE (HTML dosyalarını sunmak için):
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // 'public' klasörünü dışarı aç
    }),

    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Place],
      autoLoadEntities: true,
      synchronize: true,
    }),
    PlacesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}