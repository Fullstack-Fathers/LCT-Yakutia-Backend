exports.up = function (knex) {
  return knex.schema.createTable('prof_courses', function (table) {
    table.increments('id').primary();
    table.integer('course_id');
    table.integer('profession_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('prof_courses');
};
