exports.up = function (knex) {
  return knex.schema.createTable('users', function (table) {
    table.increments('id').primary();
    table.string('firstname');
    table.string('lastname');
    table.string('email');
    table.string('password_hash');
    table.string('role');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
