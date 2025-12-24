import { Test, TestingModule } from '@nestjs/testing';
import { PlacesService } from './places.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';

// Sahte (Mock) Repository
const mockPlaceRepository = {
  create: jest.fn().mockImplementation(dto => dto),
  save: jest.fn().mockImplementation(place => Promise.resolve({ id: '123', ...place })),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ name: 'Test Cafe', distance: 100 }]), // Sahte veri
  })),
};

describe('PlacesService', () => {
  let service: PlacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacesService,
        {
          provide: getRepositoryToken(Place),
          useValue: mockPlaceRepository,
        },
      ],
    }).compile();

    service = module.get<PlacesService>(PlacesService);
  });

  it('servis tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  it('findNearest fonksiyonu mekan listesi dönmeli', async () => {
    const result = await service.findNearest(39.92, 32.85, 'cafe');
    expect(result).toBeDefined();
    expect(result[0].name).toEqual('Test Cafe'); // Beklediğimiz sahte veri geliyor mu?
    expect(mockPlaceRepository.createQueryBuilder).toHaveBeenCalled(); // Veritabanı sorgusu çağrıldı mı?
  });
});