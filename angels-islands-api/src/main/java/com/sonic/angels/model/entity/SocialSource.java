package com.sonic.angels.model.entity;

/**
 * Where a piece of the Social Media portal comes from. The portal shows all three the same way; memories and the
 * bot built on top of Sonic Hub learn only from REAL.
 *  REAL          — taken from an export or a saved page (Facebook "Download your information", the 2017 wall pages…)
 *  RECONSTRUCTED — put back together from evidence (photos in an album whose dates match "added 6 new photos")
 *  SIMULATED     — written to fill the portal in, true to the chats and memories of that time
 */
public enum SocialSource { REAL, RECONSTRUCTED, SIMULATED }
