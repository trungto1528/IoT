package com.iot.back.service;

import java.util.Optional;

import org.springframework.stereotype.Service;

import com.iot.back.dto.ApiResponse;
import com.iot.back.dto.LoginDataResponse;
import com.iot.back.dto.LoginRequest;
import com.iot.back.dto.RegisterRequest;
import com.iot.back.dto.UserProfileResponse;
import com.iot.back.entity.User;
import com.iot.back.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public ApiResponse<LoginDataResponse> login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getPassword() != null && user.getPassword().equals(request.getPassword())) {
                LoginDataResponse data = LoginDataResponse.builder()
                        .id(user.getId())
                        .display_name(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                        .build();
                return ApiResponse.<LoginDataResponse>builder()
                        .success(1)
                        .data(data)
                        .message("Đăng nhập thành công")
                        .build();
            }
        }

        // Đăng nhập thất bại
        return ApiResponse.<LoginDataResponse>builder()
                .success(0)
                .data(null)
                .message("Sai tên đăng nhập hoặc mật khẩu")
                .build();
    }

    public UserProfileResponse getProfile(Integer id) {
        if (id == null) return null;
        
        return userRepository.findById(id)
                .map(user -> UserProfileResponse.builder()
                        .display_name(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                        .email(user.getEmail())
                        .build())
                .orElse(null);
    }

    public ApiResponse<Object> register(RegisterRequest request) {
        // 1. Kiểm tra username trùng lặp
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ApiResponse.builder()
                    .success(0)
                    .data(null)
                    .message("Tên đăng nhập đã tồn tại")
                    .build();
        }

        // 2. Tạo user mới
        User newUser = User.builder()
                .username(request.getUsername())
                .password(request.getPassword())
                .displayName(request.getDisplay_name() != null ? request.getDisplay_name() : request.getUsername())
                .email(request.getEmail())
                .build();

        userRepository.save(newUser);

        return ApiResponse.builder()
                .success(1)
                .data(null)
                .message("Đăng ký thành công")
                .build();
    }
}