exports.up = function (knex) {
  return knex.schema.createTable('prof_recommendations', function (table) {
    table.increments('id').primary();
    table.integer('user_id');
    table.integer('profession_id');
    table.float('percent');
    table.boolean('is_watch');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('prof_recommendations');
};
