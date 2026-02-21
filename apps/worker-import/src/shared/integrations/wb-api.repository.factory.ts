import { Injectable } from '@nestjs/common';
import { WbApiRepository } from './wb.repository';
import type { WbCredentials } from '../dto/wb.dto';

@Injectable()
export class WbApiRepositoryFactory {
  create(creds: WbCredentials): WbApiRepository {
    return new WbApiRepository(creds);
  }
}
