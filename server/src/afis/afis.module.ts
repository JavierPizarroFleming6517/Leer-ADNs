import { Global, Module } from '@nestjs/common';
import { AfisService } from './afis.service';

@Global()
@Module({ providers: [AfisService], exports: [AfisService] })
export class AfisModule {}
