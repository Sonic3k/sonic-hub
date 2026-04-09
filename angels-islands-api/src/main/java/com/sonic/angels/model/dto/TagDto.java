package com.sonic.angels.model.dto;

import java.util.UUID;

public class TagDto {
    public static class Request {
        private String name; private String color;
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getColor() { return color; } public void setColor(String v) { this.color = v; }
    }
    public static class Response {
        private UUID id; private String name; private String color;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getColor() { return color; } public void setColor(String v) { this.color = v; }
    }
}
