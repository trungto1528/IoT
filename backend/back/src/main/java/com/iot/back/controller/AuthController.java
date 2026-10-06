package com.iot.back.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iot.back.dto.ApiResponse;
import com.iot.back.dto.LoginDataResponse;
import com.iot.back.dto.LoginRequest;
import com.iot.back.dto.ProfileRequest;
import com.iot.back.dto.RegisterRequest;
import com.iot.back.dto.UserProfileResponse;
import com.iot.back.service.UserService;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginDataResponse>> login(@RequestBody LoginRequest request) {
        ApiResponse<LoginDataResponse> response = userService.login(request);
        
        if (response.getSuccess() == 1) {
            return ResponseEntity.ok(response);
        }
        
        // Trả về HTTP Status 401 Unauthorized khi sai username/password
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@RequestBody ProfileRequest request) {
        UserProfileResponse profile = userService.getProfile(request != null ? request.getId() : null);
        if (profile != null) {
            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Object>> register(@RequestBody RegisterRequest request) {
        ApiResponse<Object> response = userService.register(request);
        
        if (response.getSuccess() == 1) {
            // Trả về HTTP Status 201 Created (hoặc 200 OK) khi đăng ký thành công
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }
        
        // Trả về HTTP Status 400 Bad Request khi trùng tài khoản/dữ liệu không hợp lệ
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}