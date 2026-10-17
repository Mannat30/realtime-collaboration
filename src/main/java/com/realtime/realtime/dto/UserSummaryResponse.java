
package com.realtime.realtime.dto;

public class UserSummaryResponse {

    private String name;
    private String email;

    public UserSummaryResponse() {
    }

    public UserSummaryResponse(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }
}
