package com.sonic.angels.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Wraps the application's DataSource so that every statement executed on one of its connections adds one to
 * {@link SqlCounter}. It sits under everything that talks to the database — Hibernate, JdbcTemplate, native queries —
 * so the count on a request is the number of round trips it really made. A batch (executeBatch) is one round trip
 * and counts as one. Nothing else about the connection or the statement is changed.
 */
@Component
public class SqlCountingDataSource implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        if (bean instanceof DataSource ds && !(bean instanceof Counting)) return new Counting(ds);
        return bean;
    }

    static final class Counting extends DelegatingDataSource {

        Counting(DataSource target) { super(target); }

        @Override
        public Connection getConnection() throws SQLException { return counting(super.getConnection()); }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            return counting(super.getConnection(username, password));
        }
    }

    private static Connection counting(Connection connection) {
        return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[] { Connection.class },
            (proxy, method, args) -> {
                Object result = call(connection, method, args);
                if (result instanceof CallableStatement s) return counting(s, CallableStatement.class);
                if (result instanceof PreparedStatement s) return counting(s, PreparedStatement.class);
                if (result instanceof Statement s) return counting(s, Statement.class);
                return result;
            });
    }

    private static Object counting(Statement statement, Class<? extends Statement> as) {
        return Proxy.newProxyInstance(as.getClassLoader(), new Class<?>[] { as },
            (proxy, method, args) -> {
                // execute, executeQuery, executeUpdate, executeBatch and their "large" forms: one trip to the database
                if (method.getName().startsWith("execute")) SqlCounter.one();
                return call(statement, method, args);
            });
    }

    /** calls through, and throws what the driver threw (an SQLException), not the reflection wrapper around it */
    private static Object call(Object target, Method method, Object[] args) throws Throwable {
        try {
            return method.invoke(target, args);
        } catch (InvocationTargetException e) {
            throw e.getCause() != null ? e.getCause() : e;
        }
    }
}
