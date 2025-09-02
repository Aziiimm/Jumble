/**
 * Creates table: game_scores
 * - (game_id, player_id) composite PK
 * - display_name: optional (null if unknown)
 * - score: int (final score for that game)
 */
export async function up(knex) {
  await knex.schema.createTable("game_scores", (t) => {
    t.text("game_id").notNullable();
    t.text("player_id").notNullable();
    t.text("display_name");
    t.integer("score").notNullable().defaultTo(0);

    t.primary(["game_id", "player_id"]);
    t.foreign("game_id").references("games.id").onDelete("CASCADE");

    t.index(["game_id"], "game_scores_game_id_idx");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("game_scores");
}
