import { Injectable } from '@nestjs/common';
import { OzonApiRepository } from './ozon.repository';
import type { OzonCredentials } from '../dto/ozon.dto';

@Injectable()
export class OzonApiRepositoryFactory {
  create(creds: OzonCredentials): OzonApiRepository {
    return new OzonApiRepository(creds);
  }
}
