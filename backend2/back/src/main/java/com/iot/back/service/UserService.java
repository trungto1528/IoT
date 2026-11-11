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
                        .username(user.getUsername())
                        .display_name(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                        .msv(user.getMsv())
                        .className(user.getClassName())
                        .github(user.getGithub())
                        .figma(user.getFigma())
                        .postman(user.getPostman())
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

        // 2. Tạo user mới, các thông tin khác được sinh mặc định
        User newUser = User.builder()
                .username(request.getUsername())
                .password(request.getPassword())
                .displayName("Tô Quang Trung")
                .className("D23CNPM-04")
                .msv("B23DCCN863")
                .postman("https://toquangtrung2510-2949482.postman.co/workspace/Default-workspace~dc498567-9ee6-4a77-9253-63fe99636a35/request/49928453-1ff0e4cb-93e9-4fcb-84cb-2ab1110cf9e2?action=share&creator=49928453")
                .github("https://github.com/trungto1528/IoT")
                .figma("https://www.figma.com/site/N2Sg8smyFsJmTT43LPS0uR/Untitled?node-id=2-588&t=CBHmJ8Ut7V4J7yHb-1")
                .build();

        userRepository.save(newUser);

        return ApiResponse.builder()
                .success(1)
                .data(null)
                .message("Đăng ký thành công")
                .build();
    }
}