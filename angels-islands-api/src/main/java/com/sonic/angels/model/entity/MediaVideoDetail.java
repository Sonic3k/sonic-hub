package com.sonic.angels.model.entity;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "media_video_detail")
public class MediaVideoDetail {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "media_file_id")
    private MediaFile mediaFile;

    @Column(name = "video_codec") private String videoCodec;
    @Column(name = "audio_codec") private String audioCodec;
    @Column(name = "bitrate") private Integer bitrate;
    @Column(name = "fps") private Float fps;
    @Column(name = "has_audio") private Boolean hasAudio;
    @Column(name = "audio_channels") private Integer audioChannels;
    @Column(name = "audio_sample_rate") private Integer audioSampleRate;
    @Column(name = "container_format") private String containerFormat;

    public MediaVideoDetail() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile mediaFile) { this.mediaFile = mediaFile; }
    public String getVideoCodec() { return videoCodec; }
    public void setVideoCodec(String v) { this.videoCodec = v; }
    public String getAudioCodec() { return audioCodec; }
    public void setAudioCodec(String v) { this.audioCodec = v; }
    public Integer getBitrate() { return bitrate; }
    public void setBitrate(Integer v) { this.bitrate = v; }
    public Float getFps() { return fps; }
    public void setFps(Float v) { this.fps = v; }
    public Boolean getHasAudio() { return hasAudio; }
    public void setHasAudio(Boolean v) { this.hasAudio = v; }
    public Integer getAudioChannels() { return audioChannels; }
    public void setAudioChannels(Integer v) { this.audioChannels = v; }
    public Integer getAudioSampleRate() { return audioSampleRate; }
    public void setAudioSampleRate(Integer v) { this.audioSampleRate = v; }
    public String getContainerFormat() { return containerFormat; }
    public void setContainerFormat(String v) { this.containerFormat = v; }
}
