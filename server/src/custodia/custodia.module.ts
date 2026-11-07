import { Global, Module } from '@nestjs/common';
import { CustodiaController } from './custodia.controller';
import { CustodiaService } from './custodia.service';

@Global()
@Module({ controllers: [CustodiaController], providers: [CustodiaService], exports: [CustodiaService] })
export class CustodiaModule {}
