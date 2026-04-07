package com.sonic.angels.model.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "media_location_detail")
public class MediaLocationDetail {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "media_file_id")
    private MediaFile mediaFile;

    @Column(name = "address") private String address;
    @Column(name = "city") private String city;
    @Column(name = "state") private String state;
    @Column(name = "country") private String country;
    @Column(name = "country_code") private String countryCode;
    @Column(name = "postal_code") private String postalCode;
    @Column(name = "place_name") private String placeName;

    public MediaLocationDetail() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile mediaFile) { this.mediaFile = mediaFile; }
    public String getAddress() { return address; }
    public void setAddress(String v) { this.address = v; }
    public String getCity() { return city; }
    public void setCity(String v) { this.city = v; }
    public String getState() { return state; }
    public void setState(String v) { this.state = v; }
    public String getCountry() { return country; }
    public void setCountry(String v) { this.country = v; }
    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String v) { this.countryCode = v; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String v) { this.postalCode = v; }
    public String getPlaceName() { return placeName; }
    public void setPlaceName(String v) { this.placeName = v; }
}
