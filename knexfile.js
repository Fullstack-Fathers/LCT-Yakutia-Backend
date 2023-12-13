module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'myuser',
      password: 'mypassword',
      database: 'mydatabase',
      port: '5432', // Change the port if your PostgreSQL server is running on a different port
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
  },
};
