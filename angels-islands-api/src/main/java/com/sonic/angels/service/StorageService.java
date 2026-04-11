package com.sonic.angels.service;

import com.sonic.angels.model.entity.MediaFile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URI;

@Service
public class StorageService {

    @Value("${storage.b2.endpoint}") private String endpoint;
    @Value("${storage.b2.region}") private String region;
    @Value("${storage.b2.key-id}") private String keyId;
    @Value("${storage.b2.app-key}") private String appKey;
    @Value("${storage.b2.bucket}") private String bucket;
    @Value("${storage.cdn-base-url}") private String cdnBaseUrl;
    @Value("${storage.prefix}") private String prefix;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (keyId == null || keyId.isBlank()) return;
        s3Client = S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(keyId, appKey)))
            .build();
    }

    public String upload(MultipartFile file, String storageKey) throws IOException {
        if (s3Client == null) throw new IllegalStateException("Storage not configured");
        String fullKey = prefix + "/" + storageKey;
        s3Client.putObject(
            PutObjectRequest.builder().bucket(bucket).key(fullKey)
                .contentType(file.getContentType()).contentLength(file.getSize()).build(),
            RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );
        return fullKey;
    }

    public String upload(byte[] data, String storageKey, String contentType) {
        if (s3Client == null) throw new IllegalStateException("Storage not configured");
        String fullKey = prefix + "/" + storageKey;
        s3Client.putObject(
            PutObjectRequest.builder().bucket(bucket).key(fullKey)
                .contentType(contentType).contentLength((long) data.length).build(),
            RequestBody.fromBytes(data)
        );
        return fullKey;
    }

    public void delete(String storageKey) {
        if (s3Client == null) return;
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
    }

    public String buildCdnUrl(String storageKey) {
        if (storageKey == null) return null;
        String base = cdnBaseUrl.endsWith("/") ? cdnBaseUrl : cdnBaseUrl + "/";
        // URL-encode each path segment to handle any remaining special chars
        String[] segments = storageKey.split("/");
        String encodedPath = java.util.Arrays.stream(segments)
            .map(s -> java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20"))
            .collect(java.util.stream.Collectors.joining("/"));
        return base + encodedPath;
    }

    public String buildCdnUrl(String storageKey, MediaFile.StorageProvider provider) {
        if (storageKey == null) return null;
        if (provider == null || provider == MediaFile.StorageProvider.B2) return buildCdnUrl(storageKey);
        return storageKey;
    }

    public String buildThumbnailUrl(String storageKey, int width) {
        return buildCdnUrl(storageKey) + "?width=" + width;
    }
}
