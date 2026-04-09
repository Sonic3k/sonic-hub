package com.sonic.angels.model.dto;

public class TagDto {
    public static class Request {
        private String name;
        private String color;
        private String description;
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getColor() { return color; } public void setColor(String v) { this.color = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
    }
    public static class Response {
        private Long id; private String name; private String color; private String description;
        public Long getId() { return id; } public void setId(Long v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getColor() { return color; } public void setColor(String v) { this.color = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
    }
}
