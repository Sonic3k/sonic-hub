package com.sonic.angels.config;

/**
 * How many SQL statements the request being served on this thread has sent to the database so far.
 * {@link SqlCountFilter} opens and closes the count around each /api request; {@link SqlCountingDataSource} adds one
 * for every statement that is executed, whoever sends it (Hibernate, a JdbcTemplate, a native query); and
 * {@link SqlCountAdvice} puts the total on the answer. Work outside a request (startup, schedulers) is not counted.
 */
public final class SqlCounter {

    private static final ThreadLocal<int[]> COUNT = new ThreadLocal<>();

    private SqlCounter() {}

    static void begin() { COUNT.set(new int[1]); }

    static int end() {
        int[] c = COUNT.get();
        COUNT.remove();
        return c == null ? 0 : c[0];
    }

    static void one() {
        int[] c = COUNT.get();
        if (c != null) c[0]++;
    }

    public static int current() {
        int[] c = COUNT.get();
        return c == null ? 0 : c[0];
    }
}
