exports.up = function (knex) {
  return knex.schema.createTable('courses', function (table) {
    table.increments('id').primary();
    table.string('title');
    table.string('description');
    table.string('image_url');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('courses');
};
