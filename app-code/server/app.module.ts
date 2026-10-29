import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { MoodWorksModule } from './modules/mood-works/mood-works.module';
import { PlazaModule } from './modules/plaza/plaza.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    PlatformModule.forRoot(),
    MoodWorksModule,
    PlazaModule,
    AuthModule,

    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
