/**
 * Creates table: games
 * - id: text PK (use your Redis gameId, e.g. g_990813)
 * - start_ts, end_ts: BIGINT epoch milliseconds
 * - duration_sec: int (80)
 * - board: jsonb (5x5 board for audit/replay)
 * - created_at: timestamptz default now()
 */
export async function up(knex) {
  await knex.schema.createTable("games", (t) => {
    t.text("id").primary();
    t.bigInteger("start_ts"); // nullable until started
    t.bigInteger("end_ts"); // nullable until finished
    t.integer("duration_sec").notNullable();
    t.jsonb("board").notNullable();
    t.timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    t.index(["created_at"], "games_created_at_idx");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("games");
}
