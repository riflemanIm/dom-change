import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { FilesModule } from './files/files.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { HealthModule } from './health/health.module';
import { ModerationModule } from './moderation/moderation.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PointsModule } from './points/points.module';
import { PropertiesModule } from './properties/properties.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    DatabaseModule,
    FilesModule,
    RealtimeModule,
    AuthModule,
    ProfilesModule,
    HealthModule,
    PropertiesModule,
    FavoritesModule,
    SavedSearchesModule,
    ExchangesModule,
    PointsModule,
    NotificationsModule,
    ModerationModule,
  ],
})
export class AppModule {}
