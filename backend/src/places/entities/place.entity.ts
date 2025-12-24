import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
// HATA ÇÖZÜMÜ BURADA: 'import' ile '{' arasına 'type' ekle
import type { Point } from 'geojson'; 

@Entity()
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;
}