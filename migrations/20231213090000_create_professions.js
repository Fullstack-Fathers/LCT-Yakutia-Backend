exports.up = function (knex) {
  return knex.schema.createTable('professions', function (table) {
    table.increments('id').primary();
    table.string('title');
    table.string('description');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('professions');
};
