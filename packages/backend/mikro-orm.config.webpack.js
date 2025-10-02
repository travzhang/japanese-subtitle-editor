const { webpackConfig } = require('@mikro-orm/core/Utils');

module.exports = {
  config: {
    entities: [
      './src/modules/subtitle/subtitle.entity.js',
      './src/modules/subtitle/project.entity.js',
    ],
    entitiesTs: [
      './src/modules/subtitle/subtitle.entity.ts',
      './src/modules/subtitle/project.entity.ts',
    ],
    clientUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/japanese_subtitle_editor',
    migrations: {
      tableName: 'mikro_orm_migrations',
      path: './dist/migrations',
      pathTs: './src/migrations',
      pattern: /^[\w-]+\d+\.(ts|js)$/,
      transactional: true,
      disableForeignKeys: true,
      allOrNothing: true,
      dropTables: true,
      safe: false,
    },
  },
  ...webpackConfig,
};
