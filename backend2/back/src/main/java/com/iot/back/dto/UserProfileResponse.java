package com.iot.back.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String username;
    private String display_name;
    private String msv;

    @JsonProperty("class")
    private String className;

    private String github;
    private String figma;
    private String postman;
}
