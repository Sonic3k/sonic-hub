package com.sonic.angels.model.entity;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "media_location_detail")
public class MediaLocationDetail {

    @Id
    private UUID id;

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
    @Column(name = "district") private String district;
    @Column(name = "neighborhood") private String neighborhood;
    @Column(name = "street") private String street;
    @Column(name = "street_number") private String streetNumber;
    @Column(name = "formatted_address", columnDefinition = "TEXT") private String formattedAddress;
    @Column(name = "place_id") private String placeId;
    @Column(name = "geocoded_at") private java.time.LocalDateTime geocodedAt;

    public MediaLocationDetail() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
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
    public String getDistrict() { return district; }
    public void setDistrict(String v) { this.district = v; }
    public String getNeighborhood() { return neighborhood; }
    public void setNeighborhood(String v) { this.neighborhood = v; }
    public String getStreet() { return street; }
    public void setStreet(String v) { this.street = v; }
    public String getStreetNumber() { return streetNumber; }
    public void setStreetNumber(String v) { this.streetNumber = v; }
    public String getFormattedAddress() { return formattedAddress; }
    public void setFormattedAddress(String v) { this.formattedAddress = v; }
    public String getPlaceId() { return placeId; }
    public void setPlaceId(String v) { this.placeId = v; }
    public java.time.LocalDateTime getGeocodedAt() { return geocodedAt; }
    public void setGeocodedAt(java.time.LocalDateTime v) { this.geocodedAt = v; }
}
