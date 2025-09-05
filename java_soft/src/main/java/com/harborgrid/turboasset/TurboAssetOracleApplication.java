package com.harborgrid.turboasset;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.socket.config.annotation.EnableWebSocket;

/**
 * Turbo Asset - Oracle Enterprise Edition
 * 
 * Main Spring Boot application class optimized for Oracle environments.
 * Extends SpringBootServletInitializer for WebLogic Server deployment.
 */
@SpringBootApplication(scanBasePackages = "com.harborgrid.turboasset")
@EnableCaching
@EnableAsync
@EnableScheduling
@EnableTransactionManagement
@EnableWebSocket
public class TurboAssetOracleApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        System.setProperty("spring.devtools.restart.enabled", "false");
        System.setProperty("spring.devtools.livereload.enabled", "false");
        
        // Oracle optimization properties
        System.setProperty("oracle.jdbc.fanEnabled", "false");
        System.setProperty("oracle.net.disableOob", "true");
        
        SpringApplication.run(TurboAssetOracleApplication.class, args);
    }
}