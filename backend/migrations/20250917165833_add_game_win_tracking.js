/**
 * Adds game-specific win tracking to users table
 * - wordhunt_wins: Number of Word Hunt games won
 * - timebomb_wins: Number of Time Bomb games won
 * - wordhunt_games_played: Number of Word Hunt games played
 * - timebomb_games_played: Number of Time Bomb games played
 */

export async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    // Win tracking columns
    table.integer("wordhunt_wins").defaultTo(0).notNullable();
    table.integer("timebomb_wins").defaultTo(0).notNullable();

    // Games played tracking columns
    table.integer("wordhunt_games_played").defaultTo(0).notNullable();
    table.integer("timebomb_games_played").defaultTo(0).notNullable();

    // Indexes for performance
    table.index(["wordhunt_wins"], "users_wordhunt_wins_idx");
    table.index(["timebomb_wins"], "users_timebomb_wins_idx");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropIndex(["wordhunt_wins"], "users_wordhunt_wins_idx");
    table.dropIndex(["timebomb_wins"], "users_timebomb_wins_idx");

    table.dropColumn("wordhunt_wins");
    table.dropColumn("timebomb_wins");
    table.dropColumn("wordhunt_games_played");
    table.dropColumn("timebomb_games_played");
  });
}
