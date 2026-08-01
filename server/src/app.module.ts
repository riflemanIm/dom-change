import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { FilesModule } from './files/files.module';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { ModerationModule } from './moderation/moderation.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PropertiesModule } from './properties/properties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    DatabaseModule,
    FilesModule,
    AuthModule,
    ProfilesModule,
    HealthModule,
    PropertiesModule,
    FavoritesModule,
    ModerationModule,
  ],
})
export class AppModule {}
